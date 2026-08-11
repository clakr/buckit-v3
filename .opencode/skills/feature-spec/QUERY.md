# Query template

For features that return data without changing state (GET).

    # <Feature Name>

    ## Design Decisions
    <optional — include only if meaningful tradeoffs or alternatives were considered; present as a bullet list where possible; omit entirely otherwise>

    ## Trigger
    <What user action initiates this?>

    ## Content
    <What data is displayed and how>

    ## States

    ### Loading State
      - **Title:** <Brief heading>
      - **Description:** <Explanatory text (feature-specific, not generic)>

    ### Error State
    <For detail views (fetch by ID), split into the two sub-cases below. "Not found" must NOT be duplicated in the Empty State.>

    #### Not Found (404)
    <Detail views only — omit for collection views.>
      - **Title:** <Brief heading (feature-specific, e.g. "Account not found")>
      - **Description:** <Explanatory text (resource doesn't exist or was deleted)>
      - **CTA:** <Action button text and behavior (e.g. "Go back to accounts" — retrying a 404 is pointless)>

    #### Generic Failure
      - **Title:** <Brief heading>
      - **Description:** <Explanatory text (network or server error)>
      - **CTA:** <Action button text and behavior (e.g. "Retry" that refetches)>

    ### Empty State
    <Collection views only (successful fetch with zero rows). Omit entirely for detail views — "not found" belongs in the Error State, not here.>
      - **Title:** <Brief heading>
      - **Description:** <Explanatory text>
      - **CTA:** <Action button text and behavior (e.g. "Create first item" navigates to create)>

    ## Edge Cases
    <optional — include only if there are meaningful boundary conditions, permission scenarios, or special cases worth documenting; present as a bullet list where possible; omit entirely otherwise>
