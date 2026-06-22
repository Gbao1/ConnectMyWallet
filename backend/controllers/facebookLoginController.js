/**
 * Facebook Login Controller
 *
 * Handles Facebook OAuth 2.0 authentication for the ConnectMyTask platform.
 *
 * Authentication Flow:
 * 1. Client sends Facebook access token from Facebook SDK
 * 2. Server verifies token via Facebook's debug_token endpoint
 * 3. Server validates token belongs to this app (app_id check)
 * 4. Server fetches user profile from Facebook Graph API
 * 5. Server issues JWT for authenticated user
 *
 * Security: Uses Facebook's debug_token endpoint for server-side verification,
 * similar to Google's verifyIdToken() with audience validation.
 *
 * @see googleLoginController.js for comparison with Google OAuth implementation
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { captureDeviceFingerprint } = require("../services/deviceFingerprintService");

// =============================================================================
// Configuration
// =============================================================================

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_GRAPH_API_URL = "https://graph.facebook.com";
const JWT_EXPIRY = "7d";

// =============================================================================
// Token Management
// =============================================================================

/**
 * Cached Facebook app access token.
 * Used for server-to-server API calls (similar to Google's OAuth2Client instance).
 */
let cachedAppAccessToken = null;

/**
 * Retrieves a Facebook App Access Token for server-to-server API calls.
 * The token is cached to avoid unnecessary API calls.
 *
 * @returns {Promise<string>} The app access token
 * @throws {Error} If unable to obtain app access token from Facebook
 */
const getAppAccessToken = async () => {
  if (cachedAppAccessToken) {
    return cachedAppAccessToken;
  }

  const tokenUrl = `${FACEBOOK_GRAPH_API_URL}/oauth/access_token?` +
    `client_id=${FACEBOOK_APP_ID}&` +
    `client_secret=${FACEBOOK_APP_SECRET}&` +
    `grant_type=client_credentials`;

  const response = await fetch(tokenUrl);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Failed to get app access token: ${data.error.message}`);
  }

  cachedAppAccessToken = data.access_token;
  return cachedAppAccessToken;
};

// =============================================================================
// Token Verification
// =============================================================================

/**
 * Verifies a Facebook user access token and retrieves user profile.
 *
 * This function mirrors Google's verifyIdToken() pattern:
 * - Validates the token is legitimate via Facebook's debug_token endpoint
 * - Confirms the token was issued for THIS application (app_id check)
 * - Checks token expiration
 * - Fetches user profile data
 *
 * @param {string} userAccessToken - The access token from Facebook SDK on client
 * @returns {Promise<Object>} Facebook user profile { id, name, email, picture }
 * @throws {Error} If token is invalid, expired, or not issued for this app
 */
const verifyFacebookToken = async (userAccessToken) => {
  const appAccessToken = await getAppAccessToken();

  // Step 1: Verify token via debug_token endpoint (similar to Google's verifyIdToken)
  const debugUrl = `${FACEBOOK_GRAPH_API_URL}/debug_token?` +
    `input_token=${userAccessToken}&` +
    `access_token=${appAccessToken}`;

  const debugResponse = await fetch(debugUrl);
  const tokenDebugResult = await debugResponse.json();

  // Step 2: Check if token is valid
  if (tokenDebugResult.data?.error || !tokenDebugResult.data?.is_valid) {
    throw new Error("Invalid Facebook access token");
  }

  // Step 3: Verify app_id matches (equivalent to Google's audience check)
  if (tokenDebugResult.data.app_id !== FACEBOOK_APP_ID) {
    throw new Error("Token was not issued for this application");
  }

  // Step 4: Check token expiration
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (tokenDebugResult.data.expires_at && tokenDebugResult.data.expires_at < currentTimestamp) {
    throw new Error("Facebook access token has expired");
  }

  // Step 5: Fetch user profile from Graph API
  const profileUrl = `${FACEBOOK_GRAPH_API_URL}/me?` +
    `access_token=${userAccessToken}&` +
    `fields=id,name,email,picture`;

  const profileResponse = await fetch(profileUrl);
  const userProfile = await profileResponse.json();

  if (userProfile.error) {
    throw new Error(`Failed to fetch user profile: ${userProfile.error.message}`);
  }

  return userProfile;
};

// =============================================================================
// Route Handler
// =============================================================================

/**
 * Handles Facebook login requests.
 *
 * @route POST /api/auth/facebook
 * @param {Object} req.body.accessToken - Facebook access token from client SDK
 * @param {Object} req.body.fcmToken - Firebase Cloud Messaging token (optional)
 * @returns {Object} { token: JWT, user: UserObject }
 */
exports.facebookLogin = async (req, res) => {
  const { accessToken, fcmToken, role } = req.body;

  if (role && !["user", "provider"].includes(role)) {
    return res.status(400).json({ msg: "Role must be either user or provider" });
  }

  try {
    // Verify Facebook token and get user profile
    const facebookUser = await verifyFacebookToken(accessToken);

    // Validate email is provided
    const { email } = facebookUser;
    if (!email) {
      return res.status(400).json({
        error: "Email not provided by Facebook. Please ensure email permission is granted."
      });
    }

    // Find existing user in database, or create a passwordless Facebook account.
    let user = await User.findOne({ email });
    if (!user) {
      if (!role) {
        return res.status(409).json({
          code: "ROLE_REQUIRED",
          msg: "Role is required for first-time social login",
        });
      }

      user = new User({
        name: facebookUser.name || email.split("@")[0],
        email,
        facebookId: facebookUser.id,
        role,
        profilePhoto: facebookUser.picture?.data?.url || "",
        fcmToken,
        isVerified: true,
      });

      await user.save();
    }

    if (!user.facebookId) {
      user.facebookId = facebookUser.id;
    }

    // Update FCM token if provided and different
    if (fcmToken && user.fcmToken !== fcmToken) {
      user.fcmToken = fcmToken;
    }

    if (!user.isVerified) {
      user.isVerified = true;
    }

    if (user.isModified()) {
      await user.save();
    }
    await captureDeviceFingerprint({ user, req, context: "facebook_login" });

    // Generate JWT with user claims
    const jwtPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

    // Return token and user data
    res.json({ token, user });

  } catch (err) {
    console.error("Facebook login failed:", err.message);
    res.status(401).json({ error: "Invalid access token" });
  }
};
