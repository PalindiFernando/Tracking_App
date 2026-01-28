# Google Maps API Setup Guide

Complete instructions for setting up Google Maps Platform APIs for ETA calculation in the Bus Tracking System.

## Overview

This application requires Google Maps Platform APIs to calculate accurate, traffic-aware ETAs:
- **Directions API**: Calculate travel time between bus position and stops
- **Distance Matrix API**: Alternative method for ETA calculations
- **Maps JavaScript API**: Display interactive maps in the frontend

## Step-by-Step Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the **project dropdown** at the top of the page
4. Click **"New Project"**
5. Enter a project name (e.g., "Bus Tracking System")
6. Click **"Create"**
7. Wait for the project to be created, then select it from the dropdown

### Step 2: Enable Required APIs

1. In the Google Cloud Console, click the **menu icon (☰)** in the top left
2. Navigate to **"APIs & Services"** → **"Library"**
3. Search for and enable the following APIs:

   **Directions API:**
   - Search for "Directions API"
   - Click on it
   - Click **"Enable"** button
   - Wait for confirmation

   **Distance Matrix API:**
   - Search for "Distance Matrix API"
   - Click on it
   - Click **"Enable"** button
   - Wait for confirmation

   **Maps JavaScript API (for frontend):**
   - Search for "Maps JavaScript API"
   - Click on it
   - Click **"Enable"** button
   - Wait for confirmation

### Step 3: Set Up Billing Account

**Important:** Google Maps Platform APIs require a billing account, but Google provides $200 in free credits monthly.

1. Click the **menu icon (☰)** → **"Billing"**
2. Click **"Link a billing account"** or **"Create billing account"**
3. Fill in your billing information:
   - Account name
   - Country
   - Payment method (credit card required)
4. Click **"Submit and enable billing"**
5. Link the billing account to your project

**Note:** The $200 monthly credit typically covers:
- ~40,000 Directions API requests
- ~40,000 Distance Matrix API elements
- ~28,000 Maps JavaScript API loads

### Step 4: Create API Key

1. Navigate to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. A popup will appear with your new API key
4. **Copy the API key** immediately (you won't be able to see it again in full)
5. Click **"Close"**

### Step 5: Restrict API Key (Recommended for Security)

**Why restrict?** Prevents unauthorized use and reduces risk of quota exhaustion.

1. Click on the API key you just created (or click **"Edit API key"**)
2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check the following APIs:
     - ✅ Directions API
     - ✅ Distance Matrix API
     - ✅ Maps JavaScript API
3. Under **"Application restrictions"**:

   **For Backend API Key:**
   - Select **"IP addresses"**
   - Add your server IP addresses:
     - For local development: `127.0.0.1` or leave unrestricted
     - For production: Add your EC2 instance IP or server IPs
   - Or select **"None"** for development (less secure)

   **For Frontend API Key:**
   - Select **"HTTP referrers (web sites)"**
   - Add your domains:
     - For local development: `http://localhost:5173/*`
     - For production: `https://yourdomain.com/*`
     - You can add multiple referrers
4. Click **"Save"**

### Step 6: Add API Key to Your Application

**Backend Configuration:**

Create or edit `backend/.env`:
```env
GOOGLE_API_KEY=your-api-key-here
```

**Frontend Configuration:**

Create or edit `frontend/.env`:
```env
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Note:** You can use the same API key for both, or create separate keys with different restrictions.

### Step 7: Test the API Key

**Test Directions API:**
```bash
curl "https://maps.googleapis.com/maps/api/directions/json?origin=6.9271,79.8612&destination=6.9147,79.9725&departure_time=now&traffic_model=best_guess&key=YOUR_API_KEY"
```

**Expected Response:**
```json
{
  "routes": [...],
  "status": "OK"
}
```

**Test Distance Matrix API:**
```bash
curl "https://maps.googleapis.com/maps/api/distancematrix/json?origins=6.9271,79.8612&destinations=6.9147,79.9725&departure_time=now&traffic_model=best_guess&key=YOUR_API_KEY"
```

**Test Maps JavaScript API:**
- Open your frontend application
- The map should load without errors in the browser console

## Pricing Information

### Free Tier
- **$200 monthly credit** automatically applied
- Covers most small to medium deployments

### Pay-as-you-go Pricing (after free credit)
- **Directions API**: $5.00 per 1,000 requests
- **Distance Matrix API**: $5.00 per 1,000 elements
- **Maps JavaScript API**: $7.00 per 1,000 map loads

### Cost Optimization Tips

1. **Enable Caching**: The application uses 30-second cache TTL to reduce API calls
2. **Set Quotas**: Configure daily quotas to prevent unexpected charges
3. **Monitor Usage**: Regularly check API usage in Google Cloud Console
4. **Optimize Requests**: Only calculate ETAs for active buses and relevant stops

## Setting Up Quotas and Alerts

### Configure Daily Quotas

1. Go to **"APIs & Services"** → **"Quotas"**
2. Select **"Directions API"**
3. Click on a quota (e.g., "Requests per day")
4. Click **"Edit Quotas"**
5. Set a maximum (e.g., 10,000 requests/day)
6. Click **"Save"**
7. Repeat for Distance Matrix API

### Set Up Billing Alerts

1. Go to **"Billing"** → **"Budgets & alerts"**
2. Click **"Create Budget"**
3. Set budget amount (e.g., $50/month)
4. Configure alert thresholds (e.g., 50%, 90%, 100%)
5. Add email addresses for notifications
6. Click **"Create Budget"**

## Security Best Practices

1. **Never commit API keys to Git**
   - Always use `.env` files
   - Add `.env` to `.gitignore`

2. **Use separate keys for development and production**
   - Different restrictions for each environment
   - Easier to revoke if compromised

3. **Restrict API keys**
   - Limit to specific APIs
   - Restrict by IP or referrer
   - Rotate keys periodically

4. **Monitor usage**
   - Check for unusual spikes
   - Set up alerts for quota limits

## Troubleshooting

### "API key not valid" Error

**Solutions:**
- Verify the API key is copied correctly (no extra spaces)
- Check that required APIs are enabled
- Ensure billing account is linked
- Verify API key restrictions allow your IP/referrer

### "This API project is not authorized" Error

**Solutions:**
- Enable the required APIs in API Library
- Wait a few minutes after enabling (propagation delay)
- Check that billing is enabled

### "Billing required" Error

**Solutions:**
- Link a billing account to your project
- Verify billing account is active
- Check that payment method is valid

### "Quota exceeded" Error

**Solutions:**
- Check current usage in Quotas page
- Increase quota limits if needed
- Review caching strategy to reduce API calls
- Wait for quota reset (daily quotas reset at midnight Pacific Time)

### Maps Not Loading in Frontend

**Solutions:**
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set in `frontend/.env`
- Check browser console for errors
- Verify Maps JavaScript API is enabled
- Check API key restrictions allow your domain

### ETA Calculations Failing

**Solutions:**
- Verify `GOOGLE_API_KEY` is set in `backend/.env`
- Check backend logs for API errors
- Verify Directions API is enabled
- Test API key directly with curl command
- Check API quotas haven't been exceeded

## Monitoring API Usage

### View Current Usage

1. Go to **"APIs & Services"** → **"Dashboard"**
2. View charts showing API usage over time
3. Check request counts per API

### View Detailed Logs

1. Go to **"APIs & Services"** → **"Dashboard"**
2. Click on an API (e.g., Directions API)
3. View detailed metrics and logs

### Check Billing

1. Go to **"Billing"** → **"Reports"**
2. View cost breakdown by API
3. Monitor spending trends

## Additional Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Directions API Documentation](https://developers.google.com/maps/documentation/directions)
- [Distance Matrix API Documentation](https://developers.google.com/maps/documentation/distance-matrix)
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
- [API Best Practices](https://developers.google.com/maps/api-security-best-practices)

## Quick Reference

**Required APIs:**
- ✅ Directions API
- ✅ Distance Matrix API
- ✅ Maps JavaScript API

**Environment Variables:**
```env
# Backend
GOOGLE_API_KEY=your-api-key-here

# Frontend
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**Test Command:**
```bash
curl "https://maps.googleapis.com/maps/api/directions/json?origin=6.9271,79.8612&destination=6.9147,79.9725&departure_time=now&traffic_model=best_guess&key=YOUR_API_KEY"
```

---

**Last Updated:** January 2024  
**For Support:** Check Google Cloud Console documentation or contact Google Cloud Support

