# Program
The program class is responsible for -

* Fetching all dependencies required to run any given DSL.
* Initialising the program.
* Running the program.
* Providing primitives for context storage.
* Providing primitives for async locking.

Because of these capabilities, the program class alone can run any program as long as the program does not require a running server (for example, to register an endpoint). Any script-like programs will run just fine.

## Example `Func` usage
Try running this code - 

```javascript
const res = Func({
    type: 'http',
    id: '1',
    output: Func({
        type: 'switch',
        id: '2',
        output: [
            Func({
                type: 'branch',
                branches: [
                    Func({ type: 'http', id: '3', output: Func({ type: 'goto', symbolId: '1' }) }),
                    Func({ type: 'click', id: '4', output: null }),
                ],
            }),
            Func({
                type: 'branch',
                branches: [
                    Func({ type: 'http', id: '5', output: Func({ type: 'goto', symbolId: '1' }) }),
                    Func({ type: 'click', id: '6', output: null }),
                ],
            }),
        ],
    }),
})

console.log('res', JSON.stringify(res.dsl, null, 2))
```