/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User's unique identifier
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "John Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john.smith@example.com"
 *         role:
 *           type: string
 *           enum: [user, provider, admin]
 *           description: User's role in the system
 *           example: "user"
 *         profilePhoto:
 *           type: string
 *           description: URL to profile photo on Cloudinary
 *           example: "https://res.cloudinary.com/demo/image/upload/v1234/profile.jpg"
 *         location:
 *           $ref: '#/components/schemas/UserLocation'
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           description: List of skills (providers only)
 *           example: ["Plumbing", "Electrical", "Handyman"]
 *         isVerified:
 *           type: boolean
 *           description: Whether the user is verified
 *           example: true
 *         averageRating:
 *           type: number
 *           format: float
 *           description: Provider's average rating
 *           example: 4.5
 *         totalReviews:
 *           type: integer
 *           description: Total number of reviews received
 *           example: 25
 *         completedTasks:
 *           type: integer
 *           description: Number of completed tasks
 *           example: 20
 *         recommendations:
 *           type: integer
 *           description: Number of recommendations received
 *           example: 15
 *         trustScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Provider trust score based on average rating, completed task count, recommendations, and KYC verification
 *           example: 82
 *         rank:
 *           type: string
 *           enum: [Bronze, Silver, Gold, Platinum]
 *           description: Provider's rank derived from trust score
 *           example: "Gold"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-20T14:45:00.000Z"
 *
 *     UserLocation:
 *       type: object
 *       properties:
 *         country:
 *           type: string
 *           description: Country name
 *           example: "Bangladesh"
 *         lat:
 *           type: number
 *           format: float
 *           description: Latitude coordinate
 *           example: 23.7808
 *         lng:
 *           type: number
 *           format: float
 *           description: Longitude coordinate
 *           example: 90.4180
 *
 *     Task:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Task's unique identifier
 *           example: "507f1f77bcf86cd799439012"
 *         title:
 *           type: string
 *           description: Task title
 *           example: "Deep clean my apartment in Gulshan"
 *         description:
 *           type: string
 *           description: Detailed task description
 *           example: "Need a thorough deep clean for a 3-bedroom apartment. Includes kitchen, bathrooms, and all rooms."
 *         budget:
 *           type: number
 *           description: Budget in BDT
 *           example: 500
 *         deadline:
 *           type: string
 *           format: date-time
 *           description: Task deadline
 *           example: "2026-05-15T17:00:00.000Z"
 *         status:
 *           type: string
 *           enum: [Active, In Progress, Completed, Cancelled]
 *           description: Current task status
 *           example: "Active"
 *         user:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: Task creator (user ID or populated user object)
 *           example: "507f1f77bcf86cd799439011"
 *         category:
 *           type: string
 *           enum: [Cleaning, Plumbing, Electrical, Handyman, Moving, Delivery, Gardening, Tutoring, Tech Support, Other]
 *           description: Task category
 *           example: "Plumbing"
 *         location:
 *           $ref: '#/components/schemas/TaskLocation'
 *         bids:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Bid'
 *         assignedProvider:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: Assigned provider (user ID or populated user object)
 *         review:
 *           $ref: '#/components/schemas/Review'
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs to task images
 *           example: ["https://res.cloudinary.com/demo/image/upload/v1234/task1.jpg"]
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Comment'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-20T14:45:00.000Z"
 *
 *     TaskLocation:
 *       type: object
 *       required:
 *         - type
 *       properties:
 *         type:
 *           type: string
 *           enum: [remote, physical]
 *           description: Whether the task is remote or requires physical presence
 *           example: "physical"
 *         address:
 *           type: string
 *           description: Physical address (required if type is physical)
 *           example: "House 12, Road 3, Gulshan-1, Dhaka 1212"
 *         lat:
 *           type: number
 *           format: float
 *           description: Latitude (required if type is physical)
 *           example: 23.7808
 *         lng:
 *           type: number
 *           format: float
 *           description: Longitude (required if type is physical)
 *           example: 90.4180
 *
 *     Bid:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Bid's unique identifier
 *           example: "507f1f77bcf86cd799439013"
 *         provider:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: Provider who made the bid
 *         price:
 *           type: number
 *           description: Bid price in BDT
 *           example: 450
 *         estimatedTime:
 *           type: string
 *           description: Estimated time to complete
 *           example: "2 hours"
 *         comment:
 *           type: string
 *           description: Additional comment from provider
 *           example: "I have 5 years of professional cleaning experience in Dhaka. Available this week."
 *         date:
 *           type: string
 *           format: date-time
 *           description: When the bid was made
 *           example: "2024-01-16T09:00:00.000Z"
 *
 *     SubRatings:
 *       type: object
 *       required:
 *         - communication
 *         - punctuality
 *         - quality
 *         - professionalism
 *       properties:
 *         communication:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         punctuality:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         quality:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         professionalism:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *
 *     Review:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Review's unique identifier
 *           example: "507f1f77bcf86cd799439099"
 *         task:
 *           type: string
 *           description: ObjectId ref to Task
 *           example: "507f1f77bcf86cd799439012"
 *         provider:
 *           type: string
 *           description: ObjectId ref to User (provider)
 *           example: "507f1f77bcf86cd799439011"
 *         reviewer:
 *           type: string
 *           description: ObjectId ref to User (reviewer)
 *           example: "507f1f77bcf86cd799439010"
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Overall rating from 1 to 5
 *           example: 5
 *         subRatings:
 *           $ref: '#/components/schemas/SubRatings'
 *         comment:
 *           type: string
 *           maxLength: 1000
 *           description: Review comment
 *           example: "Excellent work! Fixed the tap quickly and professionally."
 *         recommend:
 *           type: boolean
 *           description: Whether the reviewer recommends this provider
 *           example: true
 *         reviewerKycVerified:
 *           type: boolean
 *           description: Whether the reviewer has completed KYC verification
 *           example: false
 *         flaggedForReview:
 *           type: boolean
 *           description: Whether the review has been flagged for moderation
 *           example: false
 *         moderationReason:
 *           type: string
 *           description: Reason for moderation flag
 *           example: null
 *         moderationNote:
 *           type: string
 *           description: Admin note from moderation
 *           example: null
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-20T14:45:00.000Z"
 *
 *     ProviderReviewsResponse:
 *       type: object
 *       properties:
 *         trustScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Computed trust score for the provider
 *           example: 82
 *         totalReviews:
 *           type: integer
 *           description: Total number of reviews the provider has received
 *           example: 25
 *         averageRating:
 *           type: number
 *           description: Provider's average rating
 *           example: 4.6
 *         reviews:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Review'
 *
 *     FlaggedReview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439099"
 *         comment:
 *           type: string
 *           example: "WORST SERVICE EVER!!!!!!"
 *         moderationReason:
 *           type: string
 *           example: "Excessive uppercase text"
 *         rating:
 *           type: integer
 *           example: 1
 *         reviewer:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *               example: "Jane Doe"
 *         provider:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *               example: "John Smith"
 *         task:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *               example: "Fix leaky kitchen tap"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-20T14:45:00.000Z"
 *
 *     Comment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Comment's unique identifier
 *           example: "507f1f77bcf86cd799439014"
 *         user:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: User who made the comment
 *         text:
 *           type: string
 *           description: Comment text
 *           example: "Is the tap a mixer or standard?"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2024-01-16T10:00:00.000Z"
 *         replies:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Reply'
 *
 *     Reply:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Reply's unique identifier
 *           example: "507f1f77bcf86cd799439015"
 *         user:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: User who made the reply
 *         text:
 *           type: string
 *           description: Reply text
 *           example: "It's a mixer tap."
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2024-01-16T10:30:00.000Z"
 *
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Message's unique identifier
 *           example: "507f1f77bcf86cd799439016"
 *         sender:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: Message sender
 *         receiver:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: Message receiver
 *         text:
 *           type: string
 *           description: Message text
 *           example: "Hi, I'm interested in your task."
 *         image:
 *           type: string
 *           description: URL to attached image
 *           example: "https://res.cloudinary.com/demo/image/upload/v1234/message.jpg"
 *         read:
 *           type: boolean
 *           description: Whether the message has been read
 *           example: false
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-16T11:00:00.000Z"
 *
 *     ChatSummary:
 *       type: object
 *       properties:
 *         otherUser:
 *           $ref: '#/components/schemas/User'
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: integer
 *           description: Number of unread messages
 *           example: 3
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     Error:
 *       type: object
 *       properties:
 *         msg:
 *           type: string
 *           description: Error message
 *           example: "Invalid credentials"
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               msg:
 *                 type: string
 *               param:
 *                 type: string
 *               location:
 *                 type: string
 *
 *     ValidationError:
 *       type: object
 *       properties:
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               msg:
 *                 type: string
 *                 example: "Name is required"
 *               param:
 *                 type: string
 *                 example: "name"
 *               location:
 *                 type: string
 *                 example: "body"
 *
 *     ProviderReview:
 *       type: object
 *       properties:
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         comment:
 *           type: string
 *           example: "Great work, highly recommended!"
 *         reviewer:
 *           $ref: '#/components/schemas/User'
 *         task:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               example: "Fix leaky kitchen tap"
 *
 *     Location:
 *       type: object
 *       properties:
 *         state:
 *           type: string
 *           example: "New South Wales"
 *         cities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               city:
 *                 type: string
 *                 example: "Sydney"
 *               suburbs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Bondi", "Manly", "Parramatta"]
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB document ID
 *           example: "507f1f77bcf86cd799439020"
 *         transactionId:
 *           type: string
 *           description: Unique transaction identifier
 *           example: "TXN_1706789432_a1b2c3d4"
 *         taskId:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/Task'
 *           description: Task being paid for
 *         userId:
 *           oneOf:
 *             - type: string
 *             - $ref: '#/components/schemas/User'
 *           description: User who initiated the payment
 *         psp:
 *           type: string
 *           enum: [sslcommerz, payfast]
 *           description: Payment Service Provider
 *           example: "sslcommerz"
 *         pspOrderId:
 *           type: string
 *           description: PSP's order/transaction ID
 *           example: "SSL_ORD_123456"
 *         amount:
 *           type: number
 *           description: Payment amount
 *           example: 500
 *         currency:
 *           type: string
 *           enum: [BDT, PKR, AUD]
 *           description: Currency code
 *           example: "BDT"
 *         status:
 *           type: string
 *           enum: [pending, processing, success, failed, refunded, cancelled]
 *           description: Transaction status
 *           example: "pending"
 *         paymentMethod:
 *           type: string
 *           enum: [card, upi, wallet, mobile_banking, net_banking, other]
 *           description: Payment method used
 *           example: "card"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:35:00.000Z"
 *
 *     PaymentInitiateResponse:
 *       type: object
 *       properties:
 *         msg:
 *           type: string
 *           example: "Payment initiated"
 *         transactionId:
 *           type: string
 *           example: "TXN_1706789432_a1b2c3d4"
 *         status:
 *           type: string
 *           example: "pending"
 *         amount:
 *           type: number
 *           example: 500
 *         currency:
 *           type: string
 *           example: "BDT"
 *         psp:
 *           type: string
 *           example: "sslcommerz"
 *         paymentUrl:
 *           type: string
 *           nullable: true
 *           description: URL to redirect user for payment. For SSLCommerz this is the GatewayPageURL. Null for unsupported PSPs.
 *           example: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php?Q=pay&SESSIONKEY=..."
 *         formFields:
 *           type: object
 *           nullable: true
 *           description: Form fields to submit to PSP payment page (PayFast). Null for unsupported PSPs.
 *           properties:
 *             merchant_id:
 *               type: string
 *               example: "10045479"
 *             merchant_key:
 *               type: string
 *               example: "kh830aqquw0tc"
 *             return_url:
 *               type: string
 *               example: "http://localhost:3000/payment/success"
 *             cancel_url:
 *               type: string
 *               example: "http://localhost:3000/payment/cancel"
 *             notify_url:
 *               type: string
 *               example: "http://localhost:5001/api/payments/webhook/payfast"
 *             m_payment_id:
 *               type: string
 *               example: "TXN_1706789432_a1b2c3d4"
 *             amount:
 *               type: string
 *               example: "500.00"
 *             item_name:
 *               type: string
 *               example: "Task: Fix leaky tap"
 *             signature:
 *               type: string
 *               example: "a1b2c3d4e5f6..."
 *
 *     TransactionStatus:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *           example: "TXN_1706789432_a1b2c3d4"
 *         status:
 *           type: string
 *           enum: [pending, processing, success, failed, refunded, cancelled]
 *           example: "pending"
 *         amount:
 *           type: number
 *           example: 500
 *         currency:
 *           type: string
 *           example: "BDT"
 *         psp:
 *           type: string
 *           example: "sslcommerz"
 *         pspOrderId:
 *           type: string
 *           nullable: true
 *           example: null
 *         paymentMethod:
 *           type: string
 *           nullable: true
 *           example: null
 *         task:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             title:
 *               type: string
 *             status:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     PaymentHistoryResponse:
 *       type: object
 *       properties:
 *         transactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *               status:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               psp:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 nullable: true
 *               task:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   status:
 *                     type: string
 *                   category:
 *                     type: string
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 25
 *             pages:
 *               type: integer
 *               example: 3
 *
 *     KYCStatus:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         role:
 *           type: string
 *           enum: [user, provider, admin]
 *         isVerified:
 *           type: boolean
 *           example: false
 *         kyc:
 *           $ref: '#/components/schemas/KYCInfo'
 *         didit:
 *           $ref: '#/components/schemas/DITITWorkflow'
 *
 *     KYCInfo:
 *       type: object
 *       properties:
 *         provider:
 *           type: string
 *           enum: [didit, manual, null]
 *           description: KYC verification provider
 *           example: null
 *         status:
 *           type: string
 *           enum: [not_started, pending, verified, failed]
 *           description: Current verification status
 *           example: "not_started"
 *         diditWorkflowUrl:
 *           type: string
 *           nullable: true
 *           example: null
 *         diditWorkflowId:
 *           type: string
 *           nullable: true
 *           example: null
 *         verificationId:
 *           type: string
 *           nullable: true
 *           description: Unique verification session ID
 *           example: null
 *         lastRedirectAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When user was last redirected to DIDIT
 *           example: null
 *         lastVerifiedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When verification was completed
 *           example: null
 *
 *     DITITWorkflow:
 *       type: object
 *       properties:
 *         workflowUrl:
 *           type: string
 *           description: DIDIT verification page URL
 *           example: "https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA"
 *         workflowId:
 *           type: string
 *           description: DIDIT workflow ID
 *           example: "8f9856c5-eee8-44fc-87a9-9ccf75776f34"
 *
 *     KYCInitiateResponse:
 *       type: object
 *       properties:
 *         msg:
 *           type: string
 *           example: "KYC verification started"
 *         verificationId:
 *           type: string
 *           description: Unique verification session ID for this attempt
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         redirectUrl:
 *           type: string
 *           description: URL to redirect user's browser to DIDIT platform
 *           example: "https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA?workflowId=...&externalUserId=...&verificationId=...&redirect_url=..."
 */
