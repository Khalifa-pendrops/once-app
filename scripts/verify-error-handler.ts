import { handlePrismaError } from "../src/utils/errors";
import { Prisma } from "@prisma/client";

// Mock FastifyReply
class MockReply {
  _code: number = 200;
  _sent: any = null;

  code(c: number) {
    this._code = c;
    return this;
  }

  send(data: any) {
    this._sent = data;
    return this;
  }
}

async function testErrorHandler() {
  console.log("Testing handlePrismaError for P1001...");
  
  const reply = new MockReply() as any;
  const p1001Err = new Prisma.PrismaClientKnownRequestError("Can't reach database", {
    code: "P1001",
    clientVersion: "mock",
  });

  handlePrismaError(p1001Err, reply);

  if (reply._code === 503 && reply._sent.error === "DB_UNAVAILABLE") {
    console.log("✅ SUCCESS: P1001 mapped to 503");
  } else {
    console.error("❌ FAILURE: Expected 503, got", reply._code);
    process.exit(1);
  }

  console.log("Testing handlePrismaError for generic error...");
  const reply2 = new MockReply() as any;
  handlePrismaError(new Error("Generic Boom"), reply2);

  if (reply2._code === 500) {
    console.log("✅ SUCCESS: Generic error mapped to 500");
  } else {
    console.error("❌ FAILURE: Expected 500, got", reply2._code);
    process.exit(1);
  }
}

testErrorHandler().catch(console.error);
