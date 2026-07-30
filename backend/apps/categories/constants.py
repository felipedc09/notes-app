"""FR-07 / NFR-06: the fixed default category set seeded for every new user.

Exactly three entries — name, color, order — never user-editable.
"""

DEFAULT_CATEGORIES = [
    {"name": "Random Thoughts", "color": "#ef9c66", "order": 0},
    {"name": "School", "color": "#fcdc94", "order": 1},
    {"name": "Personal", "color": "#78aba8", "order": 2},
]
