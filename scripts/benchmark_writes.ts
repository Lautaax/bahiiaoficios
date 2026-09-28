import { performance } from 'perf_hooks';

// Simulated Firestore network latency (e.g. 40ms per roundtrip)
const SIMULATED_LATENCY_MS = 40;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockSequentialAddDoc() {
  await delay(SIMULATED_LATENCY_MS);
  return { id: 'mock-id-' + Math.random() };
}

async function mockSequentialUpdateDoc() {
  await delay(SIMULATED_LATENCY_MS);
}

async function mockBatchCommit() {
  await delay(SIMULATED_LATENCY_MS);
}

class MockBatch {
  private operations: Array<any> = [];

  set(ref: any, data: any) {
    this.operations.push({ type: 'set', ref, data });
  }

  update(ref: any, data: any) {
    this.operations.push({ type: 'update', ref, data });
  }

  async commit() {
    await mockBatchCommit();
  }
}

async function runSequentialMode(pendingPros: string[], requestId: string) {
  const start = performance.now();
  let count = 0;

  for (const proId of pendingPros) {
    await mockSequentialAddDoc(); // notificaciones
    await mockSequentialAddDoc(); // recordatorios_presupuestos
    count += 2;
  }

  await mockSequentialUpdateDoc(); // quoteRequests update
  count += 1;

  const duration = performance.now() - start;
  return { duration, totalOperations: count };
}

async function runBatchMode(pendingPros: string[], requestId: string) {
  const start = performance.now();
  let count = 0;

  const batch = new MockBatch();

  for (const proId of pendingPros) {
    batch.set(`notificaciones/mock-id-${proId}`, { userId: proId });
    batch.set(`recordatorios_presupuestos/mock-id-${proId}`, { proId });
    count += 2;
  }

  batch.update(`quoteRequests/${requestId}`, { recordatorio24hEnviado: true });
  count += 1;

  await batch.commit();

  const duration = performance.now() - start;
  return { duration, totalOperations: count };
}

async function runBenchmark() {
  console.log('--- FIRESTORE WRITE BENCHMARK ---');
  console.log(`Simulated RTT Latency: ${SIMULATED_LATENCY_MS}ms\n`);

  const proCounts = [1, 3, 5, 10];

  for (const proCount of proCounts) {
    const pros = Array.from({ length: proCount }, (_, i) => `pro_${i + 1}`);
    const requestId = 'req_123';

    const seqResult = await runSequentialMode(pros, requestId);
    const batchResult = await runBatchMode(pros, requestId);

    const speedup = (seqResult.duration / batchResult.duration).toFixed(2);

    console.log(`[Pros count: ${proCount}]`);
    console.log(`  Sequential approach : ${seqResult.duration.toFixed(2)}ms (${seqResult.totalOperations} network roundtrips)`);
    console.log(`  WriteBatch approach : ${batchResult.duration.toFixed(2)}ms (1 network roundtrip)`);
    console.log(`  Speedup multiplier  : ${speedup}x faster\n`);
  }
}

runBenchmark().catch(console.error);
