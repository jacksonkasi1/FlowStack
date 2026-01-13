#!/bin/bash

# Test script for environment variable parsing logic
# specifically testing escaped quotes and trailing content validation

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

failed=0

test_parse() {
  local input_line="$1"
  local expected_value="$2"
  local should_fail="$3"
  local description="$4"

  # Split on first = only
  local key="${input_line%%=*}"
  local value="${input_line#*=}"

  # Trim leading/trailing whitespace from key
  key=$(echo "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

  # Trim leading/trailing whitespace from value
  value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

  # ==============================================================================
  # LOGIC FROM deploy.sh START
  # ==============================================================================
  local parse_error=0

  if [[ "$value" =~ ^\"(([^\"\\]|\\.)*)\"(.*)$ ]]; then
    # Double-quoted value with escaped quote support
    value="${BASH_REMATCH[1]}"
    local tail="${BASH_REMATCH[3]}"

    # Validate tail is only whitespace and optional comment
    if [[ -n "$tail" ]] && [[ ! "$tail" =~ ^[[:space:]]*(#.*)?$ ]]; then
      parse_error=1
    fi

    # Un-escape: \" → " and \\ → \
    value=$(echo "$value" | sed -e 's/\\"/"/g' -e 's/\\\\/\\/g')

  elif [[ "$value" =~ ^\'(([^\'\\]|\\.)*)\'(.*)$ ]]; then
    # Single-quoted value with escaped quote support
    value="${BASH_REMATCH[1]}"
    local tail="${BASH_REMATCH[3]}"

    # Validate tail is only whitespace and optional comment
    if [[ -n "$tail" ]] && [[ ! "$tail" =~ ^[[:space:]]*(#.*)?$ ]]; then
      parse_error=1
    fi

    # Un-escape: \' → ' and \\ → \
    value=$(echo "$value" | sed -e "s/\\\\'/'/g" -e 's/\\\\/\\/g')

  else
    # Not quoted - strip inline comments (require space before #)
    value=$(echo "$value" | sed -E 's/[[:space:]]+#.*//')
  fi
  # ==============================================================================
  # LOGIC FROM deploy.sh END
  # ==============================================================================

  if [ "$should_fail" = "true" ]; then
    if [ "$parse_error" -eq 1 ]; then
      echo -e "${GREEN}PASS${NC}: $description (Correctly failed)"
    else
      echo -e "${RED}FAIL${NC}: $description (Expected failure, but succeeded)"
      echo "      Input: $input_line"
      echo "      Parsed value: $value"
      failed=$((failed + 1))
    fi
  else
    if [ "$parse_error" -eq 1 ]; then
      echo -e "${RED}FAIL${NC}: $description (Unexpected error during parsing)"
      echo "      Input: $input_line"
      failed=$((failed + 1))
    elif [ "$value" != "$expected_value" ]; then
      echo -e "${RED}FAIL${NC}: $description"
      echo "      Input: $input_line"
      echo "      Expected: '$expected_value'"
      echo "      Actual:   '$value'"
      failed=$((failed + 1))
    else
      echo -e "${GREEN}PASS${NC}: $description"
    fi
  fi
}

echo "Running regression tests for env parsing..."
echo "==========================================="

# 1. Standard cases
test_parse 'FOO=bar' 'bar' false "Simple unquoted value"
test_parse 'FOO=bar baz' 'bar baz' false "Unquoted value with spaces"
test_parse 'FOO="bar baz"' 'bar baz' false "Double quoted value"
test_parse "FOO='bar baz'" 'bar baz' false "Single quoted value"

# 2. Escaped quotes (The fix)
test_parse 'JSON="{\"a\":1}"' '{"a":1}' false "JSON with escaped double quotes"
test_parse "JSON='{\"a\":1}'" '{"a":1}' false "JSON in single quotes"
test_parse 'QUOTE="It\"s me"' 'It"s me' false "Escaped double quote inside double quotes"
test_parse "QUOTE='It\'s me'" "It's me" false "Escaped single quote inside single quotes"

# 3. Comments
test_parse 'FOO=bar # comment' 'bar' false "Unquoted with comment"
test_parse 'FOO="bar" # comment' 'bar' false "Double quoted with comment"
test_parse "FOO='bar' # comment" 'bar' false "Single quoted with comment"

# 4. Malformed/Security cases (The fix part 2)
test_parse 'FOO="bar"garbage' '' true "Garbage after double quotes"
test_parse "FOO='bar'garbage" '' true "Garbage after single quotes"
test_parse 'FOO="bar" var=val' '' true "Variable injection attempt after quotes"

# 5. Edge cases
test_parse 'EMPTY=""' '' false "Empty double quotes"
test_parse "EMPTY=''" '' false "Empty single quotes"
test_parse 'BACKSLASH="\\"' '\' false "Escaped backslash"

echo "==========================================="
if [ "$failed" -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}$failed tests failed.${NC}"
  exit 1
fi
