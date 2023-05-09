![Test workflow](https://github.com/mayahq/pac-runtime/actions/workflows/deno.yml/badge.svg)
# PAC Runtime
Runtime to run Maya programs.

## Instructions to run
You need to have deno installed on your machine to run this. You can [install it from here](https://deno.com/manual@v1.33.2/getting_started/installation). Once you install deno, cd into the root directory and run this command - 
```sh
deno task run
```
This will start the server.

You can look at the `pac-runtime` Postman collection in the Maya workspace to see what requests can be made.
## Run individual programs without starting the server
You can see an example of how to run individual programs in the `Program` [here](https://github.com/mayahq/pac-runtime/blob/main/tests/program/program.test.ts#L149).