export const USAGE_STATUS = 1;

export const USAGE = `Usage: connector-router <command> [arguments]

Commands:
  connector-router plan <intent> [--catalog <directory>] [--fields <file>] [--max-risk <risk>]
  connector-router validate <plan-file> [--catalog <directory>]
  connector-router --help
  connector-router --version`;

export class CliUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliUsageError';
  }
}

const COMMANDS = {
  plan: new Set(['--catalog', '--fields', '--max-risk']),
  validate: new Set(['--catalog'])
};

export function parseCommandLine(argv) {
  const [command, ...args] = argv;
  if (command === '--help' || command === '--version') {
    if (args.length) throw new CliUsageError(`${command} does not accept arguments`);
    return { command, positional: undefined, options: {} };
  }
  if (!command) throw new CliUsageError('missing command');
  const allowedOptions = COMMANDS[command];
  if (!allowedOptions) throw new CliUsageError(`unknown command: ${command}`);

  const options = {};
  let positional;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) {
      if (positional !== undefined) throw new CliUsageError(`unexpected positional argument: ${argument}`);
      positional = argument;
      continue;
    }
    if (!allowedOptions.has(argument)) throw new CliUsageError(`unknown option for ${command}: ${argument}`);
    if (Object.hasOwn(options, argument)) throw new CliUsageError(`duplicate option: ${argument}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new CliUsageError(`missing value for ${argument}`);
    options[argument] = value;
    index += 1;
  }
  if (positional === undefined) {
    throw new CliUsageError(command === 'plan' ? 'missing intent' : 'missing plan file');
  }
  return { command, positional, options };
}
