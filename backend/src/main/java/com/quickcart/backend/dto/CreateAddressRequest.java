package com.quickcart.backend.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAddressRequest {

    @Size(max = 100)
    private String name;

    @Size(max = 15)
    private String phone;

    @Size(max = 15)
    private String alternatePhone;

    /**
     * HOME / OFFICE / OTHER
     */
    @Size(max = 20)
    private String addressType;

    @Size(max = 150)
    private String locality;

    @Size(max = 150)
    private String landmark;

    @Size(max = 255)
    private String addressLine1;

    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Size(max = 10)
    @Pattern(regexp = "^$|^[0-9]{3,10}$", message = "Pincode must be numeric")
    private String pincode;

    private Boolean isDefault;
}
