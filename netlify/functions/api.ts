import serverless from "serverless-http";
import app from "../../api/index";

// Netlify AWS Lambda handler wrapping the shared Express app
export const handler = serverless(app);
