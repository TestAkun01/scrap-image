import fs from "fs";

export default function logToFile(path, message) {
  fs.appendFileSync(path, `${message}\n`, "utf8");
}
