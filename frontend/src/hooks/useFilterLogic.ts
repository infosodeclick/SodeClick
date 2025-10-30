import { useState, useCallback } from 'react'

interface FilterState {
  ageRange: [number, number]
  location: string
  interests: string[]
  gender: string
  membershipTier: string
  lookingFor?: string
  province?: string
  ageMin?: number
  ageMax?: number
  relationship?: string
  otherRelationship?: string
  distanceKm?: number
  lat?: number
  lng?: number
}

interface UseFilterLogicProps {
  onFiltersChange: (filters: FilterState) => void
}

export const useFilterLogic = ({ onFiltersChange }: UseFilterLogicProps) => {
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [18, 50],
    location: '',
    interests: [],
    gender: 'all',
    membershipTier: 'all'
  })

  const [showFilters, setShowFilters] = useState(false)

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters } as FilterState
      onFiltersChange(updated)
      return updated
    })
  }, [onFiltersChange])

  // Reset filters
  const resetFilters = useCallback(() => {
    const defaultFilters: FilterState = {
      ageRange: [18, 50],
      location: '',
      interests: [],
      gender: 'all',
      membershipTier: 'all'
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }, [onFiltersChange])

  // Apply filters
  const applyFilters = useCallback(() => {
    onFiltersChange(filters)
    setShowFilters(false)
  }, [filters, onFiltersChange])

  // Clear filters
  const clearFilters = useCallback(() => {
    resetFilters()
    setShowFilters(false)
  }, [resetFilters])

  // Toggle filter
  const toggleFilter = useCallback((filterType: string, value: string) => {
    setFilters(prev => {
      const updated: FilterState = { ...prev }
      
      switch (filterType) {
        case 'interests':
          const interests = prev.interests || []
          if (interests.includes(value)) {
            updated.interests = interests.filter(item => item !== value)
          } else {
            updated.interests = [...interests, value]
          }
          break
        case 'gender':
          updated.gender = value
          break
        case 'membershipTier':
          updated.membershipTier = value
          break
        case 'lookingFor':
          updated.lookingFor = value
          break
        case 'relationship':
          updated.relationship = value
          break
        case 'otherRelationship':
          updated.otherRelationship = value
          break
        case 'province':
          updated.province = value
          break
        case 'ageMin':
          updated.ageMin = parseInt(value)
          updated.ageRange = [parseInt(value), prev.ageRange[1]] as [number, number]
          break
        case 'ageMax':
          updated.ageMax = parseInt(value)
          updated.ageRange = [prev.ageRange[0], parseInt(value)] as [number, number]
          break
        case 'distanceKm':
          updated.distanceKm = parseInt(value)
          break
        case 'lat':
          updated.lat = parseFloat(value)
          break
        case 'lng':
          updated.lng = parseFloat(value)
          break
      }
      
      onFiltersChange(updated)
      return updated
    })
  }, [onFiltersChange])

  // Set age range
  const setAgeRange = useCallback((min: number, max: number) => {
    setFilters(prev => {
      const updated: FilterState = {
        ...prev,
        ageRange: [min, max] as [number, number],
        ageMin: min,
        ageMax: max
      }
      onFiltersChange(updated)
      return updated
    })
  }, [onFiltersChange])

  // Set location
  const setLocation = useCallback((location: string, lat?: number, lng?: number) => {
    setFilters(prev => {
      const updated = {
        ...prev,
        location,
        lat,
        lng
      }
      onFiltersChange(updated)
      return updated
    })
  }, [onFiltersChange])

  return {
    filters,
    showFilters,
    setShowFilters,
    updateFilters,
    resetFilters,
    applyFilters,
    clearFilters,
    toggleFilter,
    setAgeRange,
    setLocation
  }
}
