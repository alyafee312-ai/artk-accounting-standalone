import {webcrypto} from 'node:crypto';
import {beforeAll,describe,it,expect} from 'vitest';
import {runPreviewDiagnostics} from './runDiagnostics';
beforeAll(()=>{Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});});
describe('accounting preview encryption',()=>{
 it('round trips and rejects wrong password or tampering',async()=>{
  await expect(runPreviewDiagnostics()).resolves.toBe(true);
 });
});
