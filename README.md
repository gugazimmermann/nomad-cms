# NOMAD CMS PROJECT

## First install

- Install AWS CLI <https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html>
- Install AWS CDK CLI (Linux) `npm install -g aws-cdk`
- Create the `./.env` file from `./.env.sample`
- `cdk bootstrap`
- Build the project `make build`
- Deploy to env `make deploy`
- See the table name in the CDK CloudFormation Output:

```bash
NomadCmsStack.RestaurantsMenuTableOutput = nomadcms-nomadcmsrestaurantMenuTableC16A7176-1U0ESG9QMO01B
```

- Update `data/menu-items.json` with the table name.
- Seed the Restaurant Menu `aws dynamodb batch-write-item --request-items file://data/menu-items.json`


```JSON
{
  "restaurantID": "d471fe1e-521a-48cf-bb80-2a8ab79c2457",
  "menuID": "ee367e37-34d1-4126-881f-43c77d792284",
  "orderItems": [
    {
      "quantity": 2,
      "productID": "c65796e8-0806-4bca-950a-ebc3db101707",
      "name": "Burguer 1",
      "value": "8.69"
    },
    {
      "quantity": 1,
      "productID": "13b3e55b-e3c0-46b8-93b1-8022abca2f75",
      "name": "Burguer 2",
      "value": "6.5"
    },
    {
      "quantity": 2,
      "productID": "42020fcd-46ed-47bc-9a23-9dd00b126560",
      "name": "Soda",
      "value": "2.75"
    }
  ],
  "total": "29.38"
}
```