import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password || password.length < 12) {
  console.error("Usage: npm run auth:hash -- \"a-password-with-at-least-12-characters\"");
  process.exit(1);
}

console.log(await bcrypt.hash(password, 12));
