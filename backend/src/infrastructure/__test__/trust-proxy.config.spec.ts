function load(value?: string) {
  jest.resetModules();
  if (value === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = value;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@constants');
}

describe('TRUST_PROXY', () => {
  afterEach(() => delete process.env.TRUST_PROXY);

  it('defaults to 0', () => expect(load().TRUST_PROXY).toBe(0));
  it('accepts a number of hops', () => expect(load('2').TRUST_PROXY).toBe(2));
  it.each(['-1', 'abc', '1.5', '9'])('fails the boot on %p', (v) => {
    expect(() => load(v)).toThrow('TRUST_PROXY');
  });
});
