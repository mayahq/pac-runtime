# Program

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