import os
import re
import json

def main():
    client_file = os.path.join(os.path.dirname(__file__), '..', 'client', 'src', 'services', 'leaderboardStore.ts')
    with open(client_file, 'r', encoding='utf-8') as f:
        text = f.read()

    start_marker = 'export const DEFAULT_TOP_8: Trader[] = '
    start_idx = text.find(start_marker) + len(start_marker)
    end_marker = '];\n\n// ── Generator for Ranks 9 to 100'
    end_idx = text.find(end_marker) + 1
    ts_data = text[start_idx:end_idx]

    json_data = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)\s*:', r'\1"\2":', ts_data)
    json_data = re.sub(r',\s*([}\]])', r'\1', json_data)

    parsed = json.loads(json_data)
    print(f'Successfully parsed {len(parsed)} traders!')

    out_file = os.path.join(os.path.dirname(__file__), 'top8_clean.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, indent=2)
    print('Wrote top8_clean.json successfully.')

    # Now update PlatformSettings directly
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'axiom_core.settings')
    django.setup()
    from wallet_engine.models import PlatformSettings
    ps = PlatformSettings.objects.first()
    if not ps:
        ps = PlatformSettings.objects.create()
    ps.leaderboard_top8 = json.dumps(parsed)
    ps.save()
    print('Updated PlatformSettings.leaderboard_top8 in database successfully!')

if __name__ == '__main__':
    main()
