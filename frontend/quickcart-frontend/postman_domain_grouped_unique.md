## Auth APIs (2)
- POST /auth/login | query: - | req: email,password | resp: -
- POST /auth/register | query: - | req: name,email,password,role | resp: -

## Product APIs (19)
- POST /addresses | query: - | req: name,phone,addressLine1,city,state,pincode,isDefault | resp: -
- POST /brands/bulk | query: - | req: brands,brands[].name,brands[].slug | resp: -
- POST /categories/bulk | query: - | req: categories,categories[].name,categories[].slug | resp: -
- GET /categories/tree | query: - | req: - | resp: -
- GET /categories | query: - | req: - | resp: -
- PATCH /products/{{productId}}/deactivate | query: - | req: - | resp: -
- GET /products/{{productId}} | query: - | req: - | resp: -
- PUT /products/{{productId}} | query: - | req: <non-json-or-template-body> | resp: -
- DELETE /products/{{reviewProductId}}/reviews/me | query: - | req: - | resp: -
- GET /products/{{reviewProductId}}/reviews/me | query: - | req: - | resp: -
- PUT /products/{{reviewProductId}}/reviews/me | query: - | req: rating,comment | resp: -
- GET /products/{{reviewProductId}}/reviews/my | query: - | req: - | resp: -
- GET /products/{{reviewProductId}}/reviews | query: page,size | req: - | resp: -
- POST /products/{{reviewProductId}}/reviews | query: - | req: rating,comment | resp: -
- POST /products/bulk | query: - | req: <non-json-or-template-body> | resp: -
- GET /products/facets | query: - | req: - | resp: -
- GET /products | query: page,size | req: - | resp: -
- POST /products | query: - | req: <non-json-or-template-body> | resp: -
- PATCH /variants/{{variantId}} | query: - | req: variantName,variantValue,price,stock | resp: -

## Category APIs (3)
- PATCH /categories/{{categoryId}}/deactivate | query: - | req: - | resp: -
- GET /categories/{{categoryId}} | query: - | req: - | resp: -
- PUT /categories/{{categoryId}} | query: - | req: name,slug,parentId,displayOrder,isActive | resp: -

## Brand APIs (4)
- PATCH /brands/{{brandId}}/deactivate | query: - | req: - | resp: -
- GET /brands/{{brandId}} | query: - | req: - | resp: -
- PUT /brands/{{brandId}} | query: - | req: name,slug,logoUrl,isActive | resp: -
- GET /brands | query: - | req: - | resp: -

## Cart APIs (3)
- GET /cart/reservations | query: - | req: - | resp: -
- DELETE /cart/reserve/{{reservationId}} | query: - | req: - | resp: -
- POST /cart/reserve | query: - | req: productId,variantId,quantity | resp: -

## Order APIs (21)
- POST /orders/{{orderId}}/accept | query: - | req: - | resp: -
- POST /orders/{{orderId}}/cancel | query: - | req: reason | resp: -
- POST /orders/{{orderId}}/deliver | query: - | req: - | resp: -
- GET /orders/{{orderId}}/events | query: - | req: - | resp: -
- GET /orders/{{orderId}}/invoice | query: - | req: - | resp: -
- POST /orders/{{orderId}}/refund/approve | query: - | req: note | resp: -
- POST /orders/{{orderId}}/refund/reject | query: - | req: note | resp: -
- GET /orders/{{orderId}}/refund | query: - | req: - | resp: -
- POST /orders/{{orderId}}/reject | query: - | req: reason | resp: -
- POST /orders/{{orderId}}/shipment | query: - | req: carrier,trackingNumber,trackingUrl | resp: -
- PUT /orders/{{orderId}}/status | query: - | req: status | resp: -
- GET /orders/{{orderId}} | query: - | req: - | resp: -
- GET /orders/summary | query: - | req: - | resp: -
- GET /orders | query: page,size | req: - | resp: -
- POST /orders | query: - | req: <non-json-or-template-body> | resp: -
- GET /payments/order/{{orderId}} | query: - | req: - | resp: -
- POST /payments/razorpay/order | query: - | req: <non-json-or-template-body> | resp: -
- POST /payments/razorpay/verify | query: - | req: <non-json-or-template-body> | resp: -
- GET /shipments/{{orderId}} | query: - | req: - | resp: -
- PATCH /shipments/{{shipmentId}}/status | query: - | req: status | resp: -
- POST /shipments | query: - | req: orderId,trackingNumber,carrierName,trackingUrl,estimatedDeliveryDate | resp: -

## Shipment APIs (0)

## Return APIs (7)
- PATCH /returns/{{returnId}}/approve | query: - | req: note | resp: -
- PATCH /returns/{{returnId}}/complete | query: - | req: - | resp: -
- PATCH /returns/{{returnId}}/inspect | query: - | req: inspectionStatus | resp: -
- PATCH /returns/{{returnId}}/receive | query: - | req: - | resp: -
- PATCH /returns/{{returnId}}/reject | query: - | req: note | resp: -
- GET /returns/{{returnId}} | query: - | req: - | resp: -
- POST /returns | query: - | req: orderId,orderItemId,returnedQuantity,condition,reason | resp: -

## Refund APIs (0)

## Payment APIs (2)
- GET /payments/razorpay/key | query: - | req: - | resp: -
- POST /payments | query: - | req: <non-json-or-template-body> | resp: -

## Address APIs (4)
- PUT /addresses/{{addressId}}/default | query: - | req: - | resp: -
- DELETE /addresses/{{addressId}} | query: - | req: - | resp: -
- PATCH /addresses/{{addressId}} | query: - | req: landmark | resp: -
- GET /addresses | query: - | req: - | resp: -

## Admin APIs (14)
- POST /admin/users | query: - | req: name,email,password,roles,roles[],isActive | resp: -
- GET /inventory/batches/{{batchId}} | query: - | req: - | resp: -
- PATCH /inventory/batches/{{batchId}} | query: - | req: remainingQuantity,supplierName,isActive | resp: -
- GET /inventory/batches | query: productId | req: - | resp: -
- POST /inventory/batches | query: - | req: productId,variantId,batchCode,quantity,expiryDate,supplierName | resp: -
- GET /inventory/low-stock | query: page,size | req: - | resp: -
- GET /invoices | query: page,size | req: - | resp: -
- PATCH /users/{{manufacturerPendingUserId}}/approve | query: - | req: - | resp: -
- PATCH /users/{{retailerPendingUserId}}/approve | query: - | req: - | resp: -
- PATCH /users/{{targetUserId}}/activate | query: - | req: - | resp: -
- PATCH /users/{{targetUserId}}/deactivate | query: - | req: - | resp: -
- PATCH /users/{{targetUserId}}/reject | query: - | req: - | resp: -
- GET /users/pending | query: - | req: - | resp: -
- POST /webhooks/razorpay | query: - | req: id,event,payload | resp: -

