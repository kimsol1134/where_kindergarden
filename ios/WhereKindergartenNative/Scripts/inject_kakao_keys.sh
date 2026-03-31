#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
LOCAL_CONFIG="${PROJECT_DIR}/Config/KakaoKeys.local.xcconfig"
SHARED_CONFIG="${HOME}/.config/where-kindergarten/KakaoKeys.local.xcconfig"
INFO_PLIST="${TARGET_BUILD_DIR}/${INFOPLIST_PATH}"
PLIST_BUDDY="/usr/libexec/PlistBuddy"

normalize_value() {
    printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

is_resolved_value() {
    value="$(normalize_value "$1")"
    case "$value" in
        ""|'$('*)
            return 1
            ;;
        *)
            return 0
            ;;
    esac
}

read_config_value() {
    config_path="$1"
    key="$2"

    [ -f "$config_path" ] || return 1

    raw_value="$(awk -F= -v key="$key" '
        $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
            sub(/^[^=]*=/, "", $0)
            print
            exit
        }
    ' "$config_path")"
    value="$(normalize_value "$raw_value")"
    value="${value#\"}"
    value="${value%\"}"

    is_resolved_value "$value" || return 1
    printf '%s' "$value"
}

read_plist_value() {
    key_path="$1"
    raw_value="$("$PLIST_BUDDY" -c "Print ${key_path}" "$INFO_PLIST" 2>/dev/null || true)"
    value="$(normalize_value "$raw_value")"

    is_resolved_value "$value" || return 1
    printf '%s' "$value"
}

set_plist_string() {
    key_path="$1"
    value="$2"

    if "$PLIST_BUDDY" -c "Set ${key_path} ${value}" "$INFO_PLIST" >/dev/null 2>&1; then
        return 0
    fi

    "$PLIST_BUDDY" -c "Add ${key_path} string ${value}" "$INFO_PLIST" >/dev/null
}

delete_plist_key() {
    key_path="$1"
    "$PLIST_BUDDY" -c "Delete ${key_path}" "$INFO_PLIST" >/dev/null 2>&1 || true
}

config_has_resolved_key() {
    config_path="$1"

    read_config_value "$config_path" "WK_KAKAO_NATIVE_APP_KEY" >/dev/null 2>&1 \
        || read_config_value "$config_path" "WK_KAKAO_REST_API_KEY" >/dev/null 2>&1
}

selected_source=""
selected_source_label=""

if config_has_resolved_key "$LOCAL_CONFIG"; then
    selected_source="$LOCAL_CONFIG"
    selected_source_label="worktree-local"
elif config_has_resolved_key "$SHARED_CONFIG"; then
    selected_source="$SHARED_CONFIG"
    selected_source_label="shared-global"
fi

app_key=""
rest_key=""

if [ -n "$selected_source" ]; then
    app_key="$(read_config_value "$selected_source" "WK_KAKAO_NATIVE_APP_KEY" 2>/dev/null || true)"
    rest_key="$(read_config_value "$selected_source" "WK_KAKAO_REST_API_KEY" 2>/dev/null || true)"
fi

if [ -z "$app_key" ]; then
    app_key="$(read_plist_value ":KAKAO_NATIVE_APP_KEY" 2>/dev/null || true)"
fi

if [ -z "$rest_key" ]; then
    rest_key="$(read_plist_value ":KAKAO_REST_API_KEY" 2>/dev/null || true)"
fi

if [ -z "$selected_source_label" ] && { [ -n "$app_key" ] || [ -n "$rest_key" ]; }; then
    selected_source_label="build-settings"
fi

if [ -n "$app_key" ]; then
    set_plist_string ":KAKAO_NATIVE_APP_KEY" "$app_key"
    set_plist_string ":CFBundleURLTypes:1:CFBundleURLSchemes:0" "kakao${app_key}"
fi

if [ -n "$rest_key" ]; then
    set_plist_string ":KAKAO_REST_API_KEY" "$rest_key"
fi

if [ -n "$selected_source_label" ]; then
    set_plist_string ":KAKAO_CONFIG_SOURCE" "$selected_source_label"
else
    delete_plist_key ":KAKAO_CONFIG_SOURCE"
fi

if [ -n "$selected_source" ]; then
    echo "Resolved Kakao keys from ${selected_source_label} config."
elif [ -n "$selected_source_label" ]; then
    echo "Using Kakao keys already present in build settings."
else
    echo "warning: Kakao keys not found in worktree-local or shared-global config. Search tab will stay in degraded map fallback mode."
fi
