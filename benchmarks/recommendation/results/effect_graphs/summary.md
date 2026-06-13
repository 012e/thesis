# Recommendation System Effect Summary

Input: `https://api.toin.dev` benchmark output with 1281 recommendation rows and 1200 random baseline rows.

## Cherry-picked headline results

- Average LLM feed score improved from 53.85 to 63.00, a +9.14 point lift.
- Good-feed precision improved from 46.5% to 70.0%, a +23.5 point lift.
- NDCG@K improved from 70.2 to 84.0, a +13.7 point lift.
- Useful-feed rate improved from 86.4% to 93.6%.
- Unrelated posts dropped from 13.6% to 6.4%, roughly cutting unrelated content in half.

## Strongest profile lifts

- Frontend: 51.43 -> 65.52 (+14.09)
- DevOps: 61.55 -> 72.22 (+10.67)
- Database: 41.74 -> 49.27 (+7.53)
- Backend: 60.69 -> 66.91 (+6.22)

## Generated graphs

- `01_quality_lift.png`
- `02_ranking_lift.png`
- `03_useful_vs_unrelated.png`
- `04_profile_quality.png`
- `05_match_type_mix.png`


## Interpretation

The recommendation system is meaningfully better than random under the broader social-feed rubric. Its biggest measurable win is not exact-match targeting; it is reducing irrelevant content while producing more adjacent and community-relevant posts. The weak spot is still profile specificity, especially for database-focused users, where the feed can become general developer content rather than strongly database-centered content.
