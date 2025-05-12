const { spawn } = require("child_process");
const path = require("path");

console.log("Starting setup process...");

// Function to run a script and return a promise
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${path.basename(scriptPath)}...`);

    const process = spawn("node", [scriptPath], { stdio: "inherit" });

    process.on("close", (code) => {
      if (code === 0) {
        console.log(`${path.basename(scriptPath)} completed successfully.`);
        resolve();
      } else {
        console.error(`${path.basename(scriptPath)} failed with code ${code}.`);
        reject(new Error(`Script execution failed with code ${code}`));
      }
    });

    process.on("error", (err) => {
      console.error(`Failed to start ${path.basename(scriptPath)}: ${err}`);
      reject(err);
    });
  });
}

// Run scripts in sequence
async function setup() {
  try {
    // Create image directories first
    await runScript(path.join(__dirname, "create-image-dirs.js"));

    // Then seed database with stories
    await runScript(path.join(__dirname, "seed-stories.js"));

    console.log("\n✅ Setup completed successfully!\n");
    console.log(
      "The website should now display sample stories in the Hot, New, and Full sections."
    );
    console.log("You can now start the server with: npm start");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("Please fix the issues and try again.");
    process.exit(1);
  }
}

// Start the setup process
setup();
