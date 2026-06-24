import Zone from '../models/Zone.js';

// Get all zones
export const getZones = async (req, res) => {
  try {
    const zones = await Zone.find().sort({ createdAt: -1 });
    res.json({ success: true, data: zones });
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch zones' });
  }
};

// Create a new zone
export const createZone = async (req, res) => {
  try {
    const { name, coordinates, status } = req.body;

    if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid zone data' });
    }

    // Ensure first and last coordinates are the same to close the polygon
    const polygonCoords = [...coordinates];
    const firstPoint = polygonCoords[0];
    const lastPoint = polygonCoords[polygonCoords.length - 1];

    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      polygonCoords.push(firstPoint);
    }

    const newZone = await Zone.create({
      name,
      status: status || 'active',
      area: {
        type: 'Polygon',
        coordinates: [polygonCoords]
      }
    });

    res.status(201).json({ success: true, data: newZone, message: 'Zone created successfully' });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ success: false, message: 'Failed to create zone' });
  }
};

// Update a zone
export const updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, coordinates } = req.body;

    const updateData = { name, status };

    if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
      const polygonCoords = [...coordinates];
      const firstPoint = polygonCoords[0];
      const lastPoint = polygonCoords[polygonCoords.length - 1];

      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        polygonCoords.push(firstPoint);
      }

      updateData.area = {
        type: 'Polygon',
        coordinates: [polygonCoords]
      };
    }

    const updatedZone = await Zone.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedZone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, data: updatedZone, message: 'Zone updated successfully' });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ success: false, message: 'Failed to update zone' });
  }
};

// Delete a zone
export const deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedZone = await Zone.findByIdAndDelete(id);
    
    if (!deletedZone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ success: false, message: 'Failed to delete zone' });
  }
};

// Check if coordinates are inside any active zone
export const checkServiceAvailability = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Find any active zone that intersects with this point
    const activeZone = await Zone.findOne({
      status: 'active',
      area: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON expects [lng, lat]
          }
        }
      }
    });

    if (activeZone) {
      res.json({ 
        success: true, 
        isAvailable: true, 
        zone: { id: activeZone._id, name: activeZone.name } 
      });
    } else {
      res.json({ 
        success: true, 
        isAvailable: false, 
        message: 'Service is not available in your zone currently' 
      });
    }
  } catch (error) {
    console.error('Error checking service availability:', error);
    res.status(500).json({ success: false, message: 'Failed to check service availability' });
  }
};
