/*
 Assign random membership tiers to real users in the database.

 Distribution (total 20 accounts):
 - Platinum: 3
 - Diamond: 4
 - VIP2: 2
 - VIP1: 3
 - VIP: 5
 - Gold: 1
 - Silver: 2

 Selection rules:
 - Pick from active, non-banned users with role 'user'
 - Prefer users currently with membership.tier === 'member'
 - Avoid selecting the same user for multiple tiers
 - Set membership.startDate = now, membership.endDate = now + 30 days
*/

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const User = require('../models/User')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick'

const TARGETS = [
  { tier: 'platinum', count: 3 },
  { tier: 'diamond', count: 4 },
  { tier: 'vip2', count: 2 },
  { tier: 'vip1', count: 3 },
  { tier: 'vip', count: 5 },
  { tier: 'gold', count: 1 },
  { tier: 'silver', count: 2 },
]

async function connect() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function sampleEligible(count, excludeIds = [], requireMemberOnly = true) {
  const match = {
    isActive: true,
    isBanned: false,
    role: 'user',
    ...(requireMemberOnly ? { 'membership.tier': 'member' } : {}),
    ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
  }

  const pipeline = [
    { $match: match },
    { $sample: { size: count } },
    { $project: { _id: 1, username: 1, displayName: 1, 'membership.tier': 1 } },
  ]
  return User.aggregate(pipeline)
}

async function assignTierToUsers(users, tier) {
  const now = new Date()
  const endDate = addDays(now, 30)
  const updates = users.map(u =>
    User.findByIdAndUpdate(
      u._id,
      {
        $set: {
          'membership.tier': tier,
          'membership.startDate': now,
          'membership.endDate': endDate,
          'membership.planId': null,
        },
      },
      { new: true }
    )
  )
  return Promise.all(updates)
}

async function main() {
  await connect()
  const results = []
  const selectedIds = []

  for (const target of TARGETS) {
    const { tier, count } = target
    // First, try to pick from plain members
    const firstPick = await sampleEligible(count, selectedIds, true)
    let chosen = firstPick
    if (chosen.length < count) {
      const needed = count - chosen.length
      console.warn(`⚠️ Not enough 'member' users for ${tier}. Needed ${count}, picked ${chosen.length}. Filling ${needed} from broader pool...`)
      const excludeNow = selectedIds.concat(chosen.map(u => u._id))
      const fillPick = await sampleEligible(needed, excludeNow, false)
      chosen = chosen.concat(fillPick)
    }
    if (chosen.length === 0) {
      console.warn(`⚠️ No eligible users found for ${tier}. Skipping.`)
      results.push({ tier, users: [] })
      continue
    }
    // Cap to requested count
    chosen = chosen.slice(0, count)
    results.push({ tier, users: chosen })
    selectedIds.push(...chosen.map(u => u._id))
  }

  // Assign in DB
  const summary = []
  for (const r of results) {
    if (!r.users?.length) {
      summary.push({ tier: r.tier, assigned: 0, users: [] })
      continue
    }
    const updated = await assignTierToUsers(r.users, r.tier)
    summary.push({
      tier: r.tier,
      assigned: updated.length,
      users: updated.map(u => ({ id: u._id?.toString?.() || u._id, username: u.username, displayName: u.displayName, tier: u.membership?.tier }))
    })
  }

  // Print summary
  console.log('\n📊 Assignment Summary:')
  let total = 0
  for (const s of summary) {
    total += s.assigned
    console.log(`- ${s.tier}: ${s.assigned}`)
  }
  console.log(`Total assigned: ${total}`)
  for (const s of summary) {
    if (!s.users.length) continue
    console.log(`\n${s.tier.toUpperCase()} (${s.assigned})`) 
    s.users.forEach(u => {
      console.log(`  • ${u.id} | ${u.displayName || u.username || 'user'} -> ${s.tier}`)
    })
  }

  await mongoose.connection.close()
  console.log('\n✅ Done. Connection closed.')
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})

