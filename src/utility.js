// const STRIP_EQUAL_SIGNS = /(\=+)(?=([^'"\\]*(\\.|['"]([^'"\\]*\\.)*[^'"\\]*['"]))*[^'"]*$)/g

const SUBCOMMAND_PATTERN = /^([^"'][\S\b]+)[\s+]?([^-].*)$/i // eslint-disable-line no-useless-escape
const FLAG_PATTERN = /((?:"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|\/[^\/\\]*(?:\\[\S\s][^\/\\]*)*\/[gimy]*(?=\s|$)|(?:\\\s|\S))+)(?=\s|$)/g // eslint-disable-line no-useless-escape
const METHOD_PATTERN = /^([\w]+\s?)\(.*\)\s?{/i // eslint-disable-line no-useless-escape
const STRIP_QUOTE_PATTERN = /"([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'/ig // eslint-disable-line no-useless-escape
const COMMAND_PATTERN = /^(\w+)\s+([\s\S]+)?/i // eslint-disable-line no-useless-escape
const CONSTANTS = Object.freeze({
  SUBCOMMAND_PATTERN,
  FLAG_PATTERN,
  METHOD_PATTERN,
  STRIP_QUOTE_PATTERN,
  COMMAND_PATTERN
})

export {
  CONSTANTS as default,
  CONSTANTS,
  SUBCOMMAND_PATTERN,
  FLAG_PATTERN,
  METHOD_PATTERN,
  STRIP_QUOTE_PATTERN,
  COMMAND_PATTERN
}
