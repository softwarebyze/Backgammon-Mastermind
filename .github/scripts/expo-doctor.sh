#!/bin/bash

# Run expo-doctor and capture output and exit code
output=$(npx expo-doctor@latest 2>&1)
exit_code=$?

# The first production release intentionally remains on SDK 56 while the SDK 57
# native migration is completed separately. Keep every Doctor finding blocking
# except the single, well-known Hermes V1 memory advisory for SDK 56.
known_sdk56_hermes_exception=false
if [ $exit_code -ne 0 ] \
  && echo "$output" | grep -q '21/22 checks passed' \
  && [ "$(echo "$output" | grep -c '^✖ ')" -eq 1 ] \
  && echo "$output" | grep -q '^✖ Check for Expo SDK versions affected by Hermes V1 regressions'; then
  known_sdk56_hermes_exception=true
  exit_code=0
fi

# Output file location
output_file=".expo/expo-doctor.md"
{
  # Add summary based on exit code
  if [ "$known_sdk56_hermes_exception" = true ]; then
    echo "⚠️ **Known release exception:** Expo Doctor passed 21/22 checks. The SDK 56 Hermes V1 memory advisory is deferred to the post-release SDK 57 upgrade." > "$output_file"
    echo >> "$output_file"
    echo "\`\`\`shell" >> "$output_file"
    echo "$output" >> "$output_file"
    echo "\`\`\`" >> "$output_file"
  elif [ $exit_code -eq 0 ]; then
    echo "✅ **Good news!** We ran Expo Doctor for this PR and everything looks good, Great job!" > "$output_file"
  else
    echo "❌ **Action Required:**  We ran Expo Doctor for this PR and found some issues that need to be addressed. Please review the complete report below 👇" > "$output_file"
    echo >> "$output_file"  # Add blank line
    echo "\`\`\`shell" >> "$output_file"
    echo "$output" >> "$output_file"
    echo "\`\`\`" >> "$output_file"
  fi
}

# Show original output in terminal
echo "$output"

if [ "$known_sdk56_hermes_exception" = true ]; then
  echo "::warning::Accepting the SDK 56 Hermes advisory for the first production release; upgrade to SDK 57 remains required immediately afterward."
fi

# Return the original exit code
exit $exit_code
