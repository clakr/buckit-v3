# Query template

For features that return data without changing state (GET).

    # <Feature Name>

    **Trigger:** <What user action initiates this?>

    **Content:** <What data is displayed and how>

    **Loading State:**
      - **Title:** <Brief heading>
      - **Description:** <Explanatory text (feature-specific, not generic)>

    **Error State:**
      - **Title:** <Brief heading>
      - **Description:** <Explanatory text>
      - **CTA:** <Action button text and behavior (e.g. "Retry" that refetches)>

    **Empty State:**
      - **Title:** <Brief heading>
      - **Description:** <Explanatory text>
      - **CTA:** <Action button text and behavior (e.g. "Create first item" navigates to create)>

    **Design Decisions:** <optional — include only if meaningful tradeoffs or alternatives were considered; present as a bullet list where possible; omit this section entirely otherwise>
