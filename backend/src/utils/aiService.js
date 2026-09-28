/**
 * AI Service for generating contextual responses
 * Supports both rule-based and LLM-based responses
 */

const DISASTER_GUIDELINES = {
  flood: {
    do: [
      'Move to higher ground immediately',
      'Avoid driving through flooded areas',
      'Turn off utilities if advised',
      'Keep emergency supplies ready',
      'Stay tuned to emergency broadcasts',
    ],
    dont: [
      'Do not walk or drive through flooded water',
      'Do not touch electrical equipment in water',
      'Do not stay in basement or ground floor',
      'Do not ignore evacuation orders',
    ],
  },
  earthquake: {
    do: [
      'Drop, cover, and hold on immediately',
      'Stay away from windows and heavy objects',
      'Exit building if safe after shaking stops',
      'Use stairs, never elevators',
      'Listen to emergency alerts',
    ],
    dont: [
      'Do not run outside during shaking',
      'Do not use elevators',
      'Do not enter damaged buildings',
      'Do not stand under doorways',
    ],
  },
  cyclone: {
    do: [
      'Move to a sturdy building immediately',
      'Stay indoors in an interior room',
      'Board up windows',
      'Secure loose outdoor items',
      'Keep water and food supplies',
    ],
    dont: [
      'Do not go outside during the cyclone',
      'Do not use your vehicle',
      'Do not touch downed power lines',
      'Do not ignore evacuation orders',
    ],
  },
  fire: {
    do: [
      'Evacuate immediately if you see fire',
      'Use stairs, never elevators',
      'Stay low to avoid smoke',
      'Close doors behind you',
      'Meet at designated assembly point',
    ],
    dont: [
      'Do not return for belongings',
      'Do not take elevators',
      'Do not hide',
      'Do not open hot doors',
    ],
  },
  landslide: {
    do: [
      'Move to higher ground away from slope',
      'Listen for warning signs (unusual sounds, cracks)',
      'Avoid valleys and depression areas',
      'Have evacuation route planned',
      'Keep emergency supplies handy',
    ],
    dont: [
      'Do not ignore warning signs',
      'Do not stay in high-risk zones',
      'Do not cut trees on slopes',
      'Do not build near steep hillsides',
    ],
  },
};

const EMERGENCY_SUPPLIES = [
  '💧 Water (3 liters per person per day)',
  '🍞 Non-perishable food (canned items, crackers, nuts)',
  '🏥 First aid kit and medications',
  '🔦 Flashlights and extra batteries',
  '📻 Battery-powered or hand-crank radio',
  '📱 Chargers and power banks',
  '🧴 Sanitation items (hand sanitizer, wet wipes)',
  '🧤 Protective gear (masks, gloves)',
  '📝 Important documents (IDs, insurance)',
  '🔑 Cash and credit cards',
  '👕 Change of clothes and sturdy shoes',
  '🏠 Shelter materials (blankets, tarp)',
];

/**
 * Generate AI response with context
 */
async function generateAIResponse(query, contextData = {}, conversationHistory = [], userLocation = null) {
  try {
    // Determine response type based on query
    const responseType = determineQueryType(query);

    let response = '';

    switch (responseType) {
      case 'shelter':
        response = generateShelterResponse(query, contextData.shelters || []);
        break;

      case 'disaster':
        response = generateDisasterResponse(query, contextData.incidents || []);
        break;

      case 'guidance':
        response = generateGuidanceResponse(query);
        break;

      case 'safety':
        response = generateSafetyResponse(query);
        break;

      case 'general':
      default:
        response = generateGeneralResponse(query, contextData);
        break;
    }

    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'I apologize for the error. Please try again or contact our support team.';
  }
}

/**
 * Determine the type of query
 */
function determineQueryType(query) {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes('shelter') ||
    lowerQuery.includes('accommodation') ||
    lowerQuery.includes('vacancy') ||
    lowerQuery.includes('where to go') ||
    lowerQuery.includes('nearest') ||
    lowerQuery.includes('safe place')
  ) {
    return 'shelter';
  }

  if (
    lowerQuery.includes('report') ||
    lowerQuery.includes('incident') ||
    lowerQuery.includes('accident') ||
    lowerQuery.includes('emergency number')
  ) {
    return 'incident';
  }

  if (
    lowerQuery.includes('what to do') ||
    lowerQuery.includes('how to') ||
    lowerQuery.includes('should i') ||
    lowerQuery.includes('guide')
  ) {
    return 'guidance';
  }

  if (
    lowerQuery.includes('safe') ||
    lowerQuery.includes('danger') ||
    lowerQuery.includes('protect') ||
    lowerQuery.includes('prepare') ||
    lowerQuery.includes('supplies')
  ) {
    return 'safety';
  }

  if (
    lowerQuery.includes('flood') ||
    lowerQuery.includes('earthquake') ||
    lowerQuery.includes('cyclone') ||
    lowerQuery.includes('fire') ||
    lowerQuery.includes('landslide')
  ) {
    return 'disaster';
  }

  return 'general';
}

/**
 * Generate shelter-related response
 */
function generateShelterResponse(query, shelters = []) {
  if (!shelters || shelters.length === 0) {
    return '🏠 I couldn\'t find any nearby shelters at the moment. Please check:\n\n1. Try scrolling through the Shelter Finder on your dashboard\n2. Contact your local authorities for temporary shelter locations\n3. Call emergency services for immediate assistance\n\nRemember: Safety first! Contact the emergency number for urgent help.';
  }

  const nearestShelter = shelters[0];
  let response = `🏠 **Nearby Shelters Found (${shelters.length} available):**\n\n`;

  // Add top 3 shelters
  shelters.slice(0, 3).forEach((shelter, index) => {
    const occupancyBar = getOccupancyBar(parseInt(shelter.occupancyPercentage));
    response += `${index + 1}. **${shelter.name}**\n`;
    response += `   📍 ${shelter.address}\n`;
    response += `   📞 Contact: ${shelter.contact || 'Not available'}\n`;
    response += `   📊 Capacity: ${shelter.occupancy}/${shelter.capacity} (${occupancyBar})\n`;
    response += `   ✅ Available: ${shelter.available} spots\n\n`;
  });

  response += '💡 **Tip:** Tap "Shelter Finder" to get directions and real-time availability updates.\n';
  response += '🚨 If you need immediate help, call emergency services!';

  return response;
}

/**
 * Generate disaster/incident response
 */
function generateDisasterResponse(query, incidents = []) {
  const disasterType = getDisasterType(query);

  if (!disasterType) {
    return 'Could you be more specific about which disaster you\'re asking about? I can help with:\n- Floods 🌊\n- Earthquakes 🏚️\n- Cyclones 🌀\n- Fires 🔥\n- Landslides ⛰️';
  }

  const guidelines = DISASTER_GUIDELINES[disasterType] || {};

  let response = `🚨 **Emergency Guidelines for ${disasterType.toUpperCase()}**\n\n`;

  if (guidelines.do) {
    response += '✅ **What TO DO:**\n';
    guidelines.do.forEach((item) => {
      response += `• ${item}\n`;
    });
    response += '\n';
  }

  if (guidelines.dont) {
    response += '❌ **What NOT to DO:**\n';
    guidelines.dont.forEach((item) => {
      response += `• ${item}\n`;
    });
    response += '\n';
  }

  // Add info about active incidents if available
  if (incidents && incidents.length > 0) {
    const relevantIncidents = incidents.filter(
      (inc) => inc.type.toLowerCase() === disasterType.toLowerCase()
    );
    if (relevantIncidents.length > 0) {
      response += `⚠️ **Active ${disasterType} Alerts in Your Area:**\n`;
      relevantIncidents.slice(0, 3).forEach((incident) => {
        response += `• ${incident.title} (${incident.severity.toUpperCase()})\n`;
      });
      response += '\n';
    }
  }

  response += '📞 **Emergency Contacts:**\n• Police: 100\n• Fire: 101\n• Ambulance: 102\n• Disaster Management: 1070\n\n';
  response += '💡 For more detailed action plan, visit the Disaster Guidelines section.';

  return response;
}

/**
 * Generate guidance response
 */
function generateGuidanceResponse(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('report')) {
    return '🚨 **How to Report an Incident:**\n\n1. Go to "Report Incident" on your dashboard\n2. Select incident type (flood, fire, earthquake, etc.)\n3. Provide location and detailed description\n4. Add photos/videos if available\n5. Include your contact information\n6. Submit - authorities will be notified instantly!\n\n💡 You can track your incident status in real-time on the dashboard.\n📍 Your location helps authorities respond faster.';
  }

  if (lowerQuery.includes('shelter')) {
    return '🏠 **How to Find a Shelter:**\n\n1. Open "Shelter Finder" from your dashboard\n2. View all nearby shelters on the map\n3. Check availability and capacity\n4. Click on a shelter for full details\n5. Contact them directly if needed\n6. Head there immediately if emergency\n\n💡 Filter by district to find shelters near you.\n✅ Only approved & verified shelters are listed.';
  }

  if (lowerQuery.includes('alert') || lowerQuery.includes('notification')) {
    return '🔔 **Stay Updated with Alerts:**\n\n✅ Enable notifications in settings\n✅ Get real-time disaster alerts\n✅ Receive important emergency updates\n✅ Know about shelter availability changes\n\n💡 Notifications are sent instantly when emergencies occur near your location.';
  }

  return '📖 **General Guidance:**\n\nI can help you with:\n• 🚨 How to report incidents\n• 🏠 Finding nearby shelters\n• 📢 Understanding alerts\n• 🆘 Emergency contacts\n• 📦 Emergency supplies checklist\n\nAsk me anything related to disaster management!';
}

/**
 * Generate safety response
 */
function generateSafetyResponse(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('prepare') || lowerQuery.includes('supplies')) {
    let response = '📦 **Essential Emergency Supplies to Keep Ready:**\n\n';
    response += EMERGENCY_SUPPLIES.join('\n');
    response += '\n\n💡 **Tips:**\n';
    response += '• Keep supplies in an easily accessible location\n';
    response += '• Check and update supplies every 6 months\n';
    response += '• Ensure everyone in family knows the location\n';
    response += '• Keep copies of important documents together\n';
    response += '\n🚨 Replace expired medications and food regularly.';
    return response;
  }

  if (lowerQuery.includes('family') || lowerQuery.includes('children') || lowerQuery.includes('plan')) {
    return '👨‍👩‍👧‍👦 **Family Emergency Plan:**\n\n1. **Establish Meeting Point:** Choose a safe location away from hazards\n2. **Communication Plan:** Have emergency contact numbers ready\n3. **Home Safety:** Secure heavy furniture and identify safe spots\n4. **Evacuation Route:** Plan multiple routes to safety\n5. **Important Documents:** Keep copies in waterproof container\n6. **Practice Drills:** Conduct regular safety drills with family\n7. **Special Needs:** Plan for elderly, disabled, or sick family members\n\n💪 A prepared family is a safe family!';
  }

  return '🛡️ **Safety Tips:**\n\n✅ Stay informed about your area\n✅ Keep emergency supplies ready\n✅ Have a family emergency plan\n✅ Know your evacuation routes\n✅ Keep important documents safe\n✅ Stay connected with community alerts\n\n📞 Always trust official emergency services!';
}

/**
 * Generate general response
 */
function generateGeneralResponse(query, contextData = {}) {
  return `ℹ️ I'm your ResQTech Emergency Assistant!\n\nI can help you with:\n\n🏠 **Shelters** - Find nearby shelters, check availability\n🚨 **Incidents** - Report emergencies, get updates\n📖 **Guidance** - Learn disaster safety tips\n⚠️ **Alerts** - Understand warnings & alerts\n📦 **Supplies** - Emergency preparedness checklist\n\nWhat would you like to know? Just ask me anything related to disasters or emergency management!`;
}

/**
 * Get disaster type from query
 */
function getDisasterType(query) {
  const lowerQuery = query.toLowerCase();
  const types = ['flood', 'earthquake', 'cyclone', 'fire', 'landslide'];

  for (const type of types) {
    if (lowerQuery.includes(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Get occupancy bar visualization
 */
function getOccupancyBar(percentage) {
  const p = Math.min(100, Math.max(0, parseInt(percentage)));
  if (p < 33) return '🟢 Low';
  if (p < 66) return '🟡 Medium';
  return '🔴 High';
}

/**
 * Format shelter data for display
 */
function formatShelterInfo(shelter) {
  return `
📍 ${shelter.name}
Address: ${shelter.address}
Contact: ${shelter.contact}
Capacity: ${shelter.occupancy}/${shelter.capacity}
Available: ${shelter.available} spots
  `.trim();
}

module.exports = {
  generateAIResponse,
  determineQueryType,
};
