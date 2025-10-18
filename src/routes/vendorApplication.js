import { Router } from 'express';
import VendorApplication from '../models/VendorApplication.js';

const router = Router();

// Submit vendor application (public route)
router.post('/submit', async (req, res) => {
  try {
    const { businessName, ownerName, contactNumber, email, address, cuisineType, licenseId } = req.body;
    
    // Validate required fields
    if (!businessName || !ownerName || !contactNumber || !email || !address || !cuisineType) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }
    
    // Check if email already has an application
    const existingApplication = await VendorApplication.findOne({ 
      email: email.toLowerCase(),
      status: { $in: ['pending', 'approved'] }
    });
    
    if (existingApplication) {
      return res.status(409).json({ 
        error: 'An application with this email already exists',
        applicationNumber: existingApplication.applicationNumber,
        status: existingApplication.status
      });
    }
    
    // Generate unique application number
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const applicationNumber = `VITVENDOR${year}${random}`;
    
    // Create application
    const application = await VendorApplication.create({
      applicationNumber,
      businessName,
      ownerName,
      contactNumber,
      email: email.toLowerCase(),
      address,
      cuisineType,
      licenseId: licenseId || '',
      status: 'pending'
    });
    
    // Emit socket event to notify admin
    const io = req.app.get('io');
    if (io) {
      io.emit('new_vendor_application', {
        applicationNumber: application.applicationNumber,
        businessName: application.businessName,
        submittedAt: application.submittedAt
      });
    }
    
    res.json({
      success: true,
      message: 'Application submitted successfully',
      applicationNumber: application.applicationNumber,
      application: application
    });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Check application status (public route)
router.get('/status/:applicationNumber', async (req, res) => {
  try {
    const application = await VendorApplication.findOne({ 
      applicationNumber: req.params.applicationNumber 
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const response = {
      applicationNumber: application.applicationNumber,
      businessName: application.businessName,
      status: application.status,
      submittedAt: application.submittedAt,
      processedAt: application.reviewedAt, // renamed for frontend compatibility
      rejectionReason: application.rejectionReason
    };
    
    // Include credentials if application is approved
    if (application.status === 'approved' && application.credentials) {
      response.credentials = application.credentials;
      response.message = 'Your application has been approved! Please save your login credentials.';
    } else if (application.status === 'pending') {
      response.message = 'Your application is under review.';
    } else if (application.status === 'rejected') {
      response.message = 'Your application has been rejected.';
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application status' });
  }
});

export default router;
