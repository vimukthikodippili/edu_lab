import 'reflect-metadata';
import { BiometricController } from './biometric.controller';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

describe('BiometricController — Release Log immutability (FR-GS-12)', () => {
  it('should not have any update or delete handler method for release log', () => {
    const methodNames = Object.getOwnPropertyNames(BiometricController.prototype);
    expect(methodNames).not.toContain('updateReleaseLog');
    expect(methodNames).not.toContain('deleteReleaseLog');
    expect(methodNames).not.toContain('removeReleaseLog');
    expect(methodNames).not.toContain('patchReleaseLog');
  });

  it('should not register DELETE, PUT, or PATCH HTTP verb on any release-log route', () => {
    const proto = BiometricController.prototype;
    const mutableVerbs = [RequestMethod.DELETE, RequestMethod.PUT, RequestMethod.PATCH];
    const handlerNames = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');

    for (const name of handlerNames) {
      const verb: RequestMethod = Reflect.getMetadata(METHOD_METADATA, proto[name]);
      if (mutableVerbs.includes(verb)) {
        const path: string = Reflect.getMetadata('path', proto[name]) ?? '';
        // Any DELETE/PUT/PATCH route must NOT target release-log paths
        expect(path).not.toMatch(/release.?log/i);
      }
    }
  });
});
