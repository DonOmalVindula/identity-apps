/**
 * Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com).
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
 * This class contains the constants for the Federated Authenticators.
 */
export class FederatedAuthenticatorConstants {
    /**
     * Private constructor to avoid object instantiation from outside
     * the class.
     */
    private constructor() { }

    /**
     * Google One Tap enabling request parameter.
     */
    public static readonly GOOGLE_ONE_TAP_ENABLED_PARAM: string = "IsGoogleOneTapEnabled";

    /**
     * Google Scope mappings.
     */
    public static readonly GOOGLE_SCOPE_DICTIONARY: Record<string, string> = {
        EMAIL: "email",
        OPENID: "openid",
        PROFILE: "profile"
    };

    /**
     * Microsoft Scope mappings.
     */
    public static readonly MICROSOFT_SCOPE_DICTIONARY: Record<string, string> = {
        EMAIL: "email",
        OPENID: "openid",
        PROFILE: "profile"
    };

    /**
     * GitHub Scope mappings.
     */
    public static readonly GITHUB_SCOPE_DICTIONARY: Record<string, string> = {
        USER_EMAIL: "user:email",
        USER_READ: "read:user"
    };
}
