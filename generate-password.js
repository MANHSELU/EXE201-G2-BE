const bcrypt = require("bcryptjs");

const password = "123456";
const hash = bcrypt.hashSync(password, 10);

console.log("Password:", password);
console.log("Hash:", hash);
console.log("\nCopy hash này để dùng trong mongosh:");
console.log(`"${hash}"`);
