# Human Annotation Guide

Edit only `keyword-evaluation-set.json`. Keep every ID and customer message unchanged. Fill each empty `gold_intent` using human judgment. Do not copy the keyword classifier prediction.

## Allowed labels

Use exactly one of these six values:

- `payment_issues`: charges, payment methods, invoices, billing, or unexpected payment activity.
- `digital_technical_problems`: Kindle, Fire TV, Prime Video, apps, downloads, playback, errors, or broken technical features.
- `account_access`: login, password, account access, account settings, or membership access when the main issue is access.
- `product_seller_issues`: counterfeit or defective products, seller behavior, product authenticity, or product pricing.
- `order_cancellation`: cancelling, changing, placing, or correcting an order when the main request is an order action.
- `unclear_messages`: vague messages, general complaints, thanks, feedback, or messages that do not provide enough information for another label.

## Choosing between labels

- Choose the label for the customer's main requested outcome, not a word that appears incidentally.
- A payment mention inside a request to cancel an order is usually `order_cancellation` unless the charge itself is the main problem.
- A product problem is `product_seller_issues` when the focus is authenticity, quality, seller behavior, or price.
- Account or Prime access is `account_access`; an unexpected membership charge is `payment_issues`.
- Use `unclear_messages` when the message is too vague to make a defensible decision.
- Do not use labels outside the six allowed values.

## Important integrity rules

- Do not change the sample, seed, IDs, or customer messages.
- Do not use classifier predictions as gold labels.
- Do not label from the historical reply alone; label the customer's message.
- Review every example before running evaluation.