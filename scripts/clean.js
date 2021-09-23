const exec = require("child_process").execSync
const os = require("os")
const fs = require("fs")

if (process.argv.length < 3) {
  console.log("Usage: node ./scripts/clean.js /path/or/file/to/be/cleaned")
  process.exit(0)
}

const targets = process.argv.slice(2)

targets.forEach(target => {
  console.log(`Deleting ${target}...`)
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      console.log("Is directory:", target)
      if (os.type() === "Windows_NT") {
        target = target.replace(/\//g, "\\")
        exec(`rmdir ${target}\\ /q /s`)
      } else {
        target = target.replace(/\\/g, "/")
        exec(`rm -rf ${target}/`)
      }
    } else {
      if (os.type() === "Windows_NT") {
        target = target.replace(/\//g, "\\")
        exec(`del ${target} /f /q`)
      } else {
        target = target.replace(/\\/g, "/")
        exec(`rm -f ${target}`)
      }
    }
  }
})
