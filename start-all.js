const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`${colors.magenta}========================================${colors.reset}`);
console.log(`${colors.magenta}    PeerSync - All-in-One Startup${colors.reset}`);
console.log(`${colors.magenta}========================================${colors.reset}\n`);

// Get project root directory
const projectRoot = __dirname;

// Check if cloudflared is installed
const checkCloudflared = () => {
  return new Promise((resolve) => {
    exec('cloudflared --version', (error) => {
      if (error) {
        console.log(`${colors.red}❌ cloudflared not found!${colors.reset}`);
        console.log(`${colors.yellow}Please install it first:${colors.reset}`);
        console.log('  Option 1 (Windows Package Manager):');
        console.log('    winget install Cloudflare.cloudflared');
        console.log('  Option 2 (Chocolatey):');
        console.log('    choco install cloudflared -y');
        console.log('  Option 3 (Manual):');
        console.log('    Download from: https://github.com/cloudflare/cloudflared/releases');
        console.log('\nAfter installation, restart this script.\n');
        process.exit(1);
      }
      console.log(`${colors.green}✅ cloudflared found${colors.reset}\n`);
      resolve();
    });
  });
};

// Start backend server
const startBackend = () => {
  console.log(`${colors.blue}[1/4]${colors.reset} Starting Backend Server...`);
  
  const backendPath = path.join(projectRoot, 'server');
  
  if (!fs.existsSync(backendPath)) {
    console.log(`${colors.red}❌ Server folder not found at: ${backendPath}${colors.reset}`);
    process.exit(1);
  }
  
  const backend = spawn('node', ['server.js'], {
    cwd: backendPath,
    shell: true,
    stdio: 'pipe'
  });

  backend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${colors.green}[Backend]${colors.reset} ${output}`);
    }
  });

  backend.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`${colors.red}[Backend Error]${colors.reset} ${output}`);
    }
  });

  backend.on('error', (err) => {
    console.error(`${colors.red}[Backend] Failed to start: ${err.message}${colors.reset}`);
    process.exit(1);
  });

  return backend;
};

// Start Cloudflare tunnel
const startTunnel = () => {
  console.log(`${colors.blue}[2/4]${colors.reset} Starting Cloudflare Tunnel...`);
  
  const tunnel = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:5000'], {
    shell: true,
    stdio: 'pipe'
  });

  tunnel.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${colors.cyan}[Tunnel]${colors.reset} ${output}`);
      
      // Extract and save URL
      const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (urlMatch) {
        const url = urlMatch[0];
        console.log('\n' + '='.repeat(60));
        console.log(`${colors.green}🔗 TUNNEL URL FOUND:${colors.reset}`);
        console.log(`${colors.yellow}${url}${colors.reset}`);
        console.log('='.repeat(60));
        
        // Update client/.env file
        const envPath = path.join(projectRoot, 'client', '.env');
        try {
          fs.writeFileSync(envPath, `VITE_BACKEND_URL=${url}\n`);
          console.log(`${colors.green}[3/4]${colors.reset} ✅ Auto-updated client/.env with tunnel URL${colors.reset}`);
        } catch (err) {
          console.log(`${colors.yellow}[3/4]${colors.reset} ⚠️ Could not auto-update .env file${colors.reset}`);
          console.log(`${colors.yellow}Please manually update client/.env with:${colors.reset}`);
          console.log(`VITE_BACKEND_URL=${url}`);
        }
        
        console.log(`\n${colors.blue}[4/4]${colors.reset} Starting Frontend...`);
        startFrontend();
      }
    }
  });

  tunnel.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`${colors.red}[Tunnel Error]${colors.reset} ${output}`);
    }
  });

  tunnel.on('error', (err) => {
    console.error(`${colors.red}[Tunnel] Failed to start: ${err.message}${colors.reset}`);
  });

  return tunnel;
};

// Start frontend dev server
const startFrontend = () => {
  console.log(`${colors.blue}[4/4]${colors.reset} Starting Frontend Dev Server...`);
  
  const clientPath = path.join(projectRoot, 'client');
  
  if (!fs.existsSync(clientPath)) {
    console.log(`${colors.red}❌ Client folder not found at: ${clientPath}${colors.reset}`);
    return;
  }
  
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: clientPath,
    shell: true,
    stdio: 'pipe'
  });

  frontend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      if (output.includes('Local:')) {
        console.log(`${colors.magenta}[Frontend]${colors.reset} ${output}`);
        console.log('\n' + '='.repeat(60));
        console.log(`${colors.green}✅ ALL SERVICES STARTED!${colors.reset}`);
        console.log(`${colors.green}📱 Open your browser at: http://localhost:5173${colors.reset}`);
        console.log('='.repeat(60) + '\n');
      } else {
        console.log(`${colors.magenta}[Frontend]${colors.reset} ${output}`);
      }
    }
  });

  frontend.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`${colors.red}[Frontend Error]${colors.reset} ${output}`);
    }
  });

  frontend.on('error', (err) => {
    console.error(`${colors.red}[Frontend] Failed to start: ${err.message}${colors.reset}`);
  });

  return frontend;
};

// Main function
async function main() {
  try {
    // Check cloudflared
    await checkCloudflared();

    // Start backend
    const backend = startBackend();

    // Wait for backend to initialize
    console.log(`${colors.yellow}Waiting 3 seconds for backend...${colors.reset}\n`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start tunnel
    const tunnel = startTunnel();

    // Handle cleanup
    const cleanup = () => {
      console.log(`\n${colors.yellow}Shutting down services...${colors.reset}`);
      if (backend) backend.kill();
      if (tunnel) tunnel.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main();