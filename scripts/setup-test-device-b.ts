import axios from "axios";

const API_URL = "http://localhost:8080";
const token = process.env.TOKEN;
const deviceB = "22222222-2222-2222-2222-222222222222";

if (!token) {
  console.error("TOKEN env var required");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

async function setupDeviceB() {
  console.log("Setting up Device B...");
  
  // 1. Register Device B
  try {
    await axios.post(`${API_URL}/devices`, {
      deviceId: deviceB,
      deviceName: "Test Device B"
    }, { headers });
    console.log("Device B registered.");
  } catch (err: any) {
    if (err.response?.status === 409) {
      console.log("Device B already registered.");
    } else {
      throw err;
    }
  }

  // 2. Upload Identity Key for Device B (Needed for bundle claim)
  await axios.post(`${API_URL}/keys/register`, {
    deviceId: deviceB,
    keyType: "identity_x25519",
    publicKey: "SWRlbnRpdHlLZXlCODA4MA=="
  }, { headers: { ...headers, "x-device-id": deviceB } });
  console.log("Identity Key uploaded for Device B.");

  // 3. Upload PreKeys for Device B
  await axios.post(`${API_URL}/prekeys/register`, {
    deviceId: deviceB,
    keyType: "x25519",
    publicKeys: ["UHJlS2V5QjE=", "UHJlS2V5QjI=", "UHJlS2V5QjM="]
  }, { headers: { ...headers, "x-device-id": deviceB } });
  console.log("PreKeys uploaded for Device B.");
}

setupDeviceB().catch(err => {
  console.error("Setup failed:", err.response?.data || err.message);
  process.exit(1);
});
