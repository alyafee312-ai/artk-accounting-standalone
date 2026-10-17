import {describe,it,expect} from 'vitest';
import {runPreviewDiagnostics} from './runDiagnostics';
describe('accounting preview encryption',()=>{
 it('round trips and rejects wrong password or tampering',async()=>{
  await expect(runPreviewDiagnostics()).resolves.toBe(true);
 });
});
