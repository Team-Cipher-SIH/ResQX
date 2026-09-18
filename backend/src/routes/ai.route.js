const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Shelter = require('../models/shelter.model');
const Incident = require('../models/incident.model');
const User = require('../models/user.model');
const { generateAIResponse } = require('../utils/aiService');

/**
 * POST /api/ai/chat
 * Chat endpoint for citizen AI assistant
 * Returns AI-powered responses with real data context
 */
router.post('/chat', protect, async (req, res) => {
  try {
    const { query, userLocation, conversationHistory } = req.body;
    const userId = req.user._id;
    const userState = req.user.state || '';
    const userDistrict = req.user.district || '';

    console.log('AI Chat Request:', {
      query,
      userLocation,
      userState,
      userDistrict,
      userId,
    });

    // Validate input
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query cannot be empty',
      });
    }

    // Fetch contextual data based on query intent
    let contextData = {};

    // Determine query intent
    const lowerQuery = query.toLowerCase();
    
    // Check if query is about shelters
    if (
      lowerQuery.includes('shelter') ||
      lowerQuery.includes('accommodation') ||
      lowerQuery.includes('refuge') ||
      lowerQuery.includes('vacancy') ||
      lowerQuery.includes('stay') ||
      lowerQuery.includes('stay safe') ||
      lowerQuery.includes('where to go')
    ) {
      contextData.shelters = await getShelterContext(userLocation, userState, userDistrict);
      contextData.queryType = 'shelter';
    }

    // Check if query is about incidents/disasters
    if (
      lowerQuery.includes('incident') ||
      lowerQuery.includes('disaster') ||
      lowerQuery.includes('emergency') ||
      lowerQuery.includes('report') ||
      lowerQuery.includes('what to do') ||
      lowerQuery.includes('how to')
    ) {
      contextData.incidents = await getIncidentContext(userState, userDistrict);
      contextData.queryType = 'disaster';
    }

    // Check if query is about safety/guidance
    if (
      lowerQuery.includes('safe') ||
      lowerQuery.includes('danger') ||
      lowerQuery.includes('protect') ||
      lowerQuery.includes('prepare') ||
      lowerQuery.includes('guide') ||
      lowerQuery.includes('tips') ||
      lowerQuery.includes('advice')
    ) {
      contextData.queryType = 'guidance';
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(
      query,
      contextData,
      conversationHistory || [],
      userLocation
    );

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process your request',
      error: error.message,
      details: error.stack,
    });
  }
});

/**
 * Get shelter context data
 * Returns nearby shelters with capacity and contact info
 */
async function getShelterContext(userLocation, userState, userDistrict) {
  try {
    let query = { isActive: true };

    // Filter by jurisdiction if available
    if (userState) {
      query.state = { $regex: userState, $options: 'i' };
    }
    if (userDistrict) {
      query.district = { $regex: userDistrict, $options: 'i' };
    }

    let shelters;

    // Try geospatial query first if location available
    if (userLocation && userLocation.lat && userLocation.lng) {
      try {
        console.log('Attempting geospatial query with location:', userLocation);
        shelters = await Shelter.find({
          ...query,
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [userLocation.lng, userLocation.lat],
              },
              $maxDistance: 50000, // 50km
            },
          },
        })
          .limit(10)
          .select('name address contactNumber capacity currentOccupancy location');
      } catch (geoError) {
        console.log('Geospatial query failed, falling back to regular query:', geoError.message);
        // Fallback to regular query without geospatial
        shelters = await Shelter.find(query)
          .limit(15)
          .select('name address contactNumber capacity currentOccupancy location');
      }
    } else {
      // Fallback: get shelters without distance filter
      console.log('No location provided, fetching shelters by jurisdiction');
      shelters = await Shelter.find(query)
        .limit(15)
        .select('name address contactNumber capacity currentOccupancy location');
    }

    console.log(`Found ${shelters.length} shelters`);

    return shelters.map((shelter) => ({
      name: shelter.name,
      address: shelter.address,
      contact: shelter.contactNumber,
      capacity: shelter.capacity,
      occupancy: shelter.currentOccupancy,
      available: Math.max(0, shelter.capacity - shelter.currentOccupancy),
      occupancyPercentage: shelter.capacity > 0 ? ((shelter.currentOccupancy / shelter.capacity) * 100).toFixed(0) : '0',
      coordinates: shelter.location?.coordinates || [],
    }));
  } catch (error) {
    console.error('Error fetching shelter context:', error);
    return [];
  }
}

/**
 * Get incident context data
 * Returns recent incidents and their status
 */
async function getIncidentContext(userState, userDistrict) {
  try {
    let query = { status: { $nin: ['closed', 'resolved'] } };

    // Filter by jurisdiction
    if (userState) {
      query.state = { $regex: userState, $options: 'i' };
    }
    if (userDistrict) {
      query.district = { $regex: userDistrict, $options: 'i' };
    }

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title type severity status location address district');

    return incidents.map((incident) => ({
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      address: incident.address,
      district: incident.district,
    }));
  } catch (error) {
    console.error('Error fetching incident context:', error);
    return [];
  }
}

const { verifyIncidentAuthenticity } = require('../utils/aiVerificationService');

/**
 * POST /api/ai/verify-incident/:id
 * Runs AI authenticity & credibility analysis on a specific incident.
 */
router.post('/verify-incident/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const aiAnalysis = await verifyIncidentAuthenticity(incident);
    incident.aiAnalysis = aiAnalysis;
    await incident.save();

    return res.status(200).json({
      success: true,
      message: 'AI analysis completed successfully',
      data: aiAnalysis,
    });
  } catch (error) {
    console.error('Error in AI incident verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to run AI verification',
      error: error.message,
    });
  }
});

module.exports = router;
