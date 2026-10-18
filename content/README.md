# World expansion — 2026-10-17

Adds three chapters to the primary inglesconbruno.com application, retaining all 255 original chapters in their original order and preserving all existing progress IDs.

- Health: **Bruno at the Vet**, B1, +110 XP / 45 Travel Points.
- Office: **The Deadline Trade-Off**, B2, +140 XP / 55 Travel Points.
- Technology: **The Confident AI Draft**, C1, +175 XP / 65 Travel Points.

There are 42 story nodes, including 30 interactive exercises. Proposed CEFR levels describe the language and tasks, not certified assessments. The veterinary scenario teaches communication and clarification, without diagnosis, dosing, or treatment recommendations.

Each chapter appears in its existing world and in new home-screen cards. Vocabulary, fill exercises, and sentence builds are also appended to those worlds' practice pools. Previously won final challenges remain replayable even when the new chapter is incomplete. Existing badges, stars, accounts, and progress are untouched. Chapter IDs are new and stable. The total becomes 258 chapters.

The alternative `/app/` page and Supabase data are unchanged. This does not automate future content generation. The primary app still includes its world content in the protected script; the JSON is the maintainable source for this batch.

`build_world_pack.py` patches an unexpanded baseline index.html once. `test_world_pack.cjs` compares the resulting app with base commit be13adf407ecf588e7fa85fcdf3c6b43ee8457de (or the temporary baseline produced by the builder), verifies preservation and exercise consistency, and checks the boss-replay guard. Temporary decoded files are not committed.
