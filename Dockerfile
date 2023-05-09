FROM denoland/deno:alpine

WORKDIR /runtime

COPY deps.ts .

RUN deno cache deps.ts

COPY . .

RUN deno cache main.ts

EXPOSE 9023

# The --lock and --lock-write flags ask deno to ignore previously
# stored hashes of the dynamic dependencies it pulled. This prevents
# someone from changing the code of the same version in a remote
# dependency. It's unsafe to do this, but we're in FAFO phase right
# now so it's ok.
CMD deno run --allow-all --lock=deno.lock --lock-write main.ts