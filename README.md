1. endpoint -> (email data) -> create entry in s3
2. s3 write event -> sns -> sqs(dlq) -> email lambda

TODO
look into doing batch emails, but need a way to do each email individually
because i only want to send n emails from each lambda
