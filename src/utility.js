// const STRIP_EQUAL_SIGNS = /(\=+)(?=([^'"\\]*(\\.|['"]([^'"\\]*\\.)*[^'"\\]*['"]))*[^'"]*$)/g

const SUBCOMMAND_PATTERN = /^([^"'][\S\b]+)[\s+]?([^-].*)$/i
const FLAG_PATTERN = /((?:"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|\/[^\/\\]*(?:\\[\S\s][^\/\\]*)*\/[gimy]*(?=\s|$)|(?:\\\s|\S))+)(?=\s|$)/g
const METHOD_PATTERN = /^([\w]+\s?)\(.*\)\s?{/i
const STRIP_QUOTE_PATTERN = /"([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'/ig
const COMMAND_PATTERN = /^(\w+)\s+([\s\S]+)?/i
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
