/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Class containing Organization Discovery config related constants.
 */
export class OrganizationDiscoveryConfigConstants {
    /**
     * Private constructor to avoid object instantiation from outside the class.
     */
    private constructor() {}

    public static readonly EMAIL_DOMAIN_DISCOVERY_PROPERTY_KEY: string = "emailDomain.enable";
    public static readonly EMAIL_DOMAIN_DISCOVERY_SELF_REG_PROPERTY_KEY: string = "emailDomainBasedSelfSignup.enable";

    public static readonly ORGANIZATION_DISCOVERY_DOMAINS_NOT_CONFIGURED_ERROR_CODE: string = "OCM-60002";
}
