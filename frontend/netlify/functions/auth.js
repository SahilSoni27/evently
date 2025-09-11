// Example: netlify/functions/auth.js
import { authController } from "../../backend/src/controllers/authController";

export const handler = async (event, context) => {
  // Convert Express routes to Netlify functions
  const { httpMethod, path, body, headers } = event;

  try {
    switch (httpMethod) {
      case "POST":
        if (path.includes("/login")) {
          return authController.login(JSON.parse(body));
        }
        break;
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
