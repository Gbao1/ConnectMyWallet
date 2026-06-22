const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ConnectMyTask API",
      version: "1.0.0",
      description:
        "API documentation for ConnectMyTask - A task marketplace where users can post tasks and service providers can bid on them.",
      contact: {
        name: "ConnectMyTask Support",
      },
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication and user profile management",
      },
      {
        name: "Tasks",
        description: "Task management, bidding, and completion",
      },
      {
        name: "Messages",
        description: "Real-time messaging between users",
      },
      {
        name: "Payments",
        description: "Payment processing with multiple PSPs (SSLCommerz, Razorpay, Payfast)",
      },
      {
        name: "KYC",
        description: "Know Your Customer verification via DIDIT",
      },
      {
        name: "Admin",
        description: "Admin-only endpoints for user and task management",
      },
      {
        name: "Locations",
        description: "Australian location data",
      },
    ],
    components: {
      securitySchemes: {
        JWTAuth: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "JWT token (no Bearer prefix required)",
        },
      },
    },
  },
  apis: [
    "./routes/*.js",
    "./docs/swagger-schemas.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
