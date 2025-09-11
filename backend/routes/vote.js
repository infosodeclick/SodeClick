const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const VoteTransaction = require('../models/VoteTransaction');
const User = require('../models/User');

// POST /api/vote/cast - โหวตให้ผู้ใช้
router.post('/cast', async (req, res) => {
  try {
    const { voterId, candidateId, votePoints, voteType, message } = req.body;

    if (!voterId || !candidateId || !votePoints || !voteType) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID, Candidate ID, Vote Points, and Vote Type are required'
      });
    }

    if (votePoints < 1) {
      return res.status(400).json({
        success: false,
        message: 'Vote points must be at least 1'
      });
    }

    const validVoteTypes = ['popularity_male', 'popularity_female', 'gift_ranking'];
    if (!validVoteTypes.includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const [voter, candidate] = await Promise.all([
      User.findById(voterId),
      User.findById(candidateId)
    ]);

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (voterId === candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot vote for yourself'
      });
    }

    // ตรวจสอบเพศสำหรับการโหวตความนิยม
    if (voteType === 'popularity_male' && candidate.gender !== 'male') {
      return res.status(400).json({
        success: false,
        message: 'Can only vote for male candidates in male popularity contest'
      });
    }

    if (voteType === 'popularity_female' && candidate.gender !== 'female') {
      return res.status(400).json({
        success: false,
        message: 'Can only vote for female candidates in female popularity contest'
      });
    }

    // ตรวจสอบคะแนนโหวต
    if (voter.votePoints < votePoints) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient vote points',
        required: votePoints,
        current: voter.votePoints
      });
    }

    // หักคะแนนโหวต
    voter.votePoints -= votePoints;

    // สร้างธุรกรรมโหวต
    const voteTransaction = new VoteTransaction({
      voter: voterId,
      candidate: candidateId,
      votePoints,
      voteType,
      message: message?.trim(),
      context: {
        type: 'ranking'
      },
      status: 'active'
    });

    // บันทึกทุกอย่าง
    await Promise.all([
      voter.save(),
      voteTransaction.save()
    ]);

    res.json({
      success: true,
      message: `Successfully voted ${votePoints} points for ${candidate.displayName}`,
      data: {
        transaction: {
          id: voteTransaction._id,
          votePoints,
          voteType,
          message: voteTransaction.message
        },
        voter: {
          remainingVotePoints: voter.votePoints
        },
        candidate: {
          username: candidate.username,
          displayName: candidate.displayName,
          gender: candidate.gender
        }
      }
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cast vote',
      error: error.message
    });
  }
});

// POST /api/vote/buy-points - ซื้อคะแนนโหวต
router.post('/buy-points', async (req, res) => {
  try {
    const { userId, packageType } = req.body;

    if (!userId || !packageType) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Package Type are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // แพ็กเกจคะแนนโหวต
    const votePackages = {
      'coins_100': { coins: 1000, votePoints: 100, name: '100 Vote Points' },
      'money_100': { money: 10, votePoints: 100, name: '100 Vote Points (Money)' }
    };

    const selectedPackage = votePackages[packageType];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package type',
        availablePackages: Object.keys(votePackages)
      });
    }

    // ตรวจสอบยอดเงิน/เหรียญ
    if (selectedPackage.coins && user.coins < selectedPackage.coins) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: selectedPackage.coins,
        current: user.coins
      });
    }

    // หักเงิน/เหรียญและเพิ่มคะแนนโหวต
    if (selectedPackage.coins) {
      user.coins -= selectedPackage.coins;
    }
    user.votePoints += selectedPackage.votePoints;

    await user.save();

    res.json({
      success: true,
      message: `Successfully purchased ${selectedPackage.votePoints} vote points`,
      data: {
        package: {
          name: selectedPackage.name,
          cost: selectedPackage.coins ? `${selectedPackage.coins} coins` : `${selectedPackage.money} THB`,
          votePoints: selectedPackage.votePoints
        },
        user: {
          remainingCoins: user.coins,
          totalVotePoints: user.votePoints
        }
      }
    });

  } catch (error) {
    console.error('Error buying vote points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to buy vote points',
      error: error.message
    });
  }
});

// GET /api/vote/ranking - ดูอันดับการโหวต
router.get('/ranking', async (req, res) => {
  try {
    const { voteType, period = 'all', limit = 50 } = req.query;
    const limitNum = parseInt(limit);

    if (!voteType) {
      return res.status(400).json({
        success: false,
        message: 'Vote type is required'
      });
    }

    let matchStage = { 
      voteType,
      status: 'active'
    };

    // กรองตามช่วงเวลา
    const now = new Date();
    if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchStage.votedAt = { $gte: weekAgo };
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchStage.votedAt = { $gte: monthAgo };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$candidate',
          totalVotes: { $sum: '$votePoints' },
          voteCount: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voter' },
          lastVoted: { $max: '$votedAt' }
        }
      },
      { $sort: { totalVotes: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];

    const ranking = await VoteTransaction.aggregate(pipeline);

    // คำนวณรางวัล
    const calculateReward = (rank, voteType) => {
      if (voteType === 'popularity_male' || voteType === 'popularity_female') {
        if (rank === 1) return { type: 'money', amount: 1000, description: 'เงินสด 1,000 บาท' };
        if (rank === 2) return { type: 'money', amount: 500, description: 'เงินสด 500 บาท' };
        if (rank === 3) return { type: 'money', amount: 300, description: 'เงินสด 300 บาท' };
        if (rank === 4) return { type: 'coins', amount: 50000, description: '50,000 เหรียญ' };
        if (rank === 5) return { type: 'coins', amount: 10000, description: '10,000 เหรียญ' };
        if (rank >= 6 && rank <= 10) return { type: 'coins', amount: 5000, description: '5,000 เหรียญ' };
        if (rank >= 11 && rank <= 20) return { type: 'coins', amount: 3000, description: '3,000 เหรียญ' };
        if (rank >= 21 && rank <= 30) return { type: 'coins', amount: 1000, description: '1,000 เหรียญ' };
        if (rank >= 31 && rank <= 50) return { type: 'coins', amount: 500, description: '500 เหรียญ' };
      } else if (voteType === 'gift_ranking') {
        if (rank === 1) return { type: 'mixed', coins: 15000, votePoints: 5000, description: '15,000 เหรียญ + 5,000 คะแนนโหวต' };
        if (rank === 2) return { type: 'mixed', coins: 10000, votePoints: 3000, description: '10,000 เหรียญ + 3,000 คะแนนโหวต' };
        if (rank === 3) return { type: 'mixed', coins: 5000, votePoints: 1000, description: '5,000 เหรียญ + 1,000 คะแนนโหวต' };
        if (rank === 4) return { type: 'mixed', coins: 3000, votePoints: 500, description: '3,000 เหรียญ + 500 คะแนนโหวต' };
        if (rank === 5) return { type: 'mixed', coins: 1000, votePoints: 100, description: '1,000 เหรียญ + 100 คะแนนโหวต' };
        if (rank >= 6 && rank <= 10) return { type: 'coins', amount: 500, description: '500 เหรียญ' };
        if (rank >= 11 && rank <= 20) return { type: 'coins', amount: 300, description: '300 เหรียญ' };
        if (rank >= 21 && rank <= 30) return { type: 'coins', amount: 100, description: '100 เหรียญ' };
        if (rank >= 31 && rank <= 50) return { type: 'coins', amount: 50, description: '50 เหรียญ' };
      }
      return null;
    };

    res.json({
      success: true,
      data: {
        ranking: ranking.map((item, index) => {
          const rank = index + 1;
          const reward = calculateReward(rank, voteType);
          
          return {
            rank,
            user: {
              id: item.user._id,
              username: item.user.username,
              displayName: item.user.displayName,
              gender: item.user.gender,
              membershipTier: item.user.membershipTier,
              verificationBadge: item.user.verificationBadge
            },
            stats: {
              totalVotes: item.totalVotes,
              voteCount: item.voteCount,
              uniqueVoters: item.uniqueVoters.length,
              lastVoted: item.lastVoted
            },
            reward
          };
        }),
        metadata: {
          voteType,
          period,
          totalRanked: ranking.length,
          generatedAt: new Date(),
          contestInfo: {
            description: voteType === 'popularity_male' ? 'การประกวดความนิยมชาย' :
                        voteType === 'popularity_female' ? 'การประกวดความนิยมหญิง' :
                        'การประกวดของขวัญ',
            rewardDistribution: '7 วันหลังจากสิ้นสุดการแข่งขัน'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vote ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vote ranking',
      error: error.message
    });
  }
});

// GET /api/vote/history/:userId - ดูประวัติการโหวต
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'cast', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (type === 'cast') {
      query.voter = userId;
    } else if (type === 'received') {
      query.candidate = userId;
    } else {
      query = {
        $or: [
          { voter: userId },
          { candidate: userId }
        ]
      };
    }

    query.status = 'active';

    const [votes, total] = await Promise.all([
      VoteTransaction.find(query)
        .populate('voter', 'username displayName membershipTier')
        .populate('candidate', 'username displayName membershipTier gender')
        .sort({ votedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      VoteTransaction.countDocuments(query)
    ]);

    // สถิติ
    const stats = await VoteTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVotesCast: {
            $sum: {
              $cond: [{ $eq: ['$voter', mongoose.Types.ObjectId(userId)] }, '$votePoints', 0]
            }
          },
          totalVotesReceived: {
            $sum: {
              $cond: [{ $eq: ['$candidate', mongoose.Types.ObjectId(userId)] }, '$votePoints', 0]
            }
          },
          uniqueCandidates: {
            $addToSet: {
              $cond: [{ $eq: ['$voter', mongoose.Types.ObjectId(userId)] }, '$candidate', null]
            }
          },
          uniqueVoters: {
            $addToSet: {
              $cond: [{ $eq: ['$candidate', mongoose.Types.ObjectId(userId)] }, '$voter', null]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        votes: votes.map(vote => ({
          id: vote._id,
          type: vote.voter._id.toString() === userId ? 'cast' : 'received',
          voter: {
            id: vote.voter._id,
            username: vote.voter.username,
            displayName: vote.voter.displayName,
            membershipTier: vote.voter.membershipTier
          },
          candidate: {
            id: vote.candidate._id,
            username: vote.candidate.username,
            displayName: vote.candidate.displayName,
            membershipTier: vote.candidate.membershipTier,
            gender: vote.candidate.gender
          },
          votePoints: vote.votePoints,
          voteType: vote.voteType,
          message: vote.message,
          votedAt: vote.votedAt
        })),
        stats: stats[0] || {
          totalVotesCast: 0,
          totalVotesReceived: 0,
          uniqueCandidates: [],
          uniqueVoters: []
        },
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vote history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vote history',
      error: error.message
    });
  }
});

module.exports = router;
