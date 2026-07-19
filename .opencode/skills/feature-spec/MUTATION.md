# Mutation template

For features that create, update, or delete data (POST, PUT, DELETE).

    # <Feature Name>

    ## Design Decisions
    <optional — include only if meaningful tradeoffs or alternatives were considered; present as a bullet list where possible; omit entirely otherwise>

    ## Trigger
    <What user action initiates this?>

    ## Behavior
    <What happens>

    ## Toast

    ### Success Message
      - **Title:** <Brief heading (feature-specific, e.g. "Invoice created" not "Success")>
      - **Description:** <Explanatory text (feature-specific, e.g. "Invoice #1024 has been sent to Acme Corp.")>

    ### Error Message
      - **Title:** <Brief heading (feature-specific)>
      - **Description:** <Explanatory text (feature-specific)>

    ## Edge Cases
    <optional — include only if there are meaningful boundary conditions, permission scenarios, or special cases worth documenting; present as a bullet list where possible; omit entirely otherwise>
