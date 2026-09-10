import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("YOUR_") || value === "your_openai_api_key_here") {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  openAiApiKey: required("OPENAI_API_KEY"),
  port: Number(process.env.PORT ?? 3000),
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}