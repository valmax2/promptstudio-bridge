package com.padelapp.app;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;
import java.util.ArrayList;

// Wrapper minimale della Play Billing Library per il singolo prodotto "Pro"
// (acquisto una tantum, non consumabile). Punto chiave: isProPurchased()
// interroga SEMPRE Play (queryPurchasesAsync) invece di fidarsi di un flag
// salvato in locale - lezione imparata da un bug reale in un'altra app
// dell'utente dove lo stato "sbloccato" locale non veniva mai riverificato.
@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;

    private void ensureConnected(Runnable onReady) {
        if (billingClient != null && billingClient.isReady()) {
            onReady.run();
            return;
        }
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases()
            .build();
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                onReady.run();
            }

            @Override
            public void onBillingServiceDisconnected() {}
        });
    }

    @PluginMethod
    public void queryProduct(PluginCall call) {
        String productId = call.getString("productId");
        ensureConnected(() -> {
            QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
            List<QueryProductDetailsParams.Product> list = new ArrayList<>();
            list.add(product);
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(list).build();
            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                JSObject ret = new JSObject();
                if (!productDetailsList.isEmpty()) {
                    ProductDetails details = productDetailsList.get(0);
                    ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
                    ret.put("found", true);
                    ret.put("title", details.getName());
                    ret.put("price", offer != null ? offer.getFormattedPrice() : "");
                } else {
                    ret.put("found", false);
                }
                call.resolve(ret);
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        ensureConnected(() -> {
            QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
            List<QueryProductDetailsParams.Product> list = new ArrayList<>();
            list.add(product);
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(list).build();
            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (productDetailsList.isEmpty()) {
                    call.reject("Prodotto non trovato su Play");
                    return;
                }
                ProductDetails details = productDetailsList.get(0);
                BillingFlowParams.ProductDetailsParams pdParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(details)
                    .build();
                List<BillingFlowParams.ProductDetailsParams> pdList = new ArrayList<>();
                pdList.add(pdParams);
                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(pdList)
                    .build();
                billingClient.launchBillingFlow(getActivity(), flowParams);
                call.resolve();
            });
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (purchases == null) return;
        for (Purchase purchase : purchases) {
            handlePurchase(purchase);
        }
        JSObject ret = new JSObject();
        ret.put("success", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
        notifyListeners("purchaseUpdate", ret);
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged()) {
            AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
            billingClient.acknowledgePurchase(ackParams, billingResult -> {});
        }
    }

    // Fonte di verità: interroga Play ad ogni chiamata (mai un flag locale).
    @PluginMethod
    public void isProPurchased(PluginCall call) {
        String productId = call.getString("productId");
        ensureConnected(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                boolean owned = false;
                for (Purchase purchase : purchases) {
                    if (purchase.getProducts().contains(productId)
                        && purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                        owned = true;
                        handlePurchase(purchase);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("pro", owned);
                call.resolve(ret);
            });
        });
    }
}
