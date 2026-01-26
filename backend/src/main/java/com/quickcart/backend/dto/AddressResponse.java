package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AddressResponse {
    Long id;
    String name;
    String phone;
    String alternatePhone;
    String addressType;
    String locality;
    String landmark;
    String addressLine1;
    String city;
    String state;
    String pincode;
    Boolean isDefault;
}
