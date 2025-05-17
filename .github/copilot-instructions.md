<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This project is a dynamic, configurable full-stack trading system. Focus on modularity for strategies/models and integration with Binance margin trading. Prioritize clean, extensible TypeScript code and separation of frontend/backend logic.
we should base it on the CCXT framework, which is a modular and extensible framework for building cryptocurrency trading bots. It provides a solid foundation for implementing various trading strategies and models, making it easier to develop and maintain the bot over time.
The bot should be designed to be modular, allowing for easy addition or removal of strategies and models. This will enable users to customize their trading experience based on their preferences and market conditions.
The bot should also be designed to be extensible, allowing for easy integration with new exchanges or trading features as needed. This will ensure that the bot remains relevant and useful in the ever-changing cryptocurrency market.
The bot should be built with TypeScript to ensure type safety and maintainability. This will help prevent bugs and make the code easier to understand and work with.
Let's start with this strategy (it's written in Python) and then we can convert it to TypeScript later. The strategy is based on the ARIMA model and uses technical indicators like MACD and EMA for forecasting. It also includes error correction using linear regression.
We should use websockets for real-time data streaming and trading, and implement a user-friendly interface for configuring and monitoring the bot's performance.
we should use .env to store sensitive information like API keys and secrets. This will help keep the code clean and secure, and make it easier to manage different environments (e.g., development, testing, production).

```python:
import ccxt
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import r2_score
from sklearn.preprocessing import StandardScaler
from ta.trend import MACD
import warnings

# Suppress convergence warnings for ARIMA
warnings.filterwarnings("ignore", category=UserWarning, module="statsmodels")

# === Data Fetching and Preparation ===
try:
    binance = ccxt.binance({'enableRateLimit': True})
    symbol = 'BTC/USDT'
    timeframe = '4h'
    since = binance.parse8601('2024-09-01T00:00:00Z')
    ohlcv = binance.fetch_ohlcv(symbol, timeframe, since=since, limit=1000)
    if not ohlcv:
        raise ValueError("No data returned from Binance API")
except Exception as e:
    raise Exception(f"Failed to fetch data from Binance: {e}")

# Create DataFrame
columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
data = pd.DataFrame(ohlcv, columns=columns)
data['date'] = pd.to_datetime(data['timestamp'], unit='ms')
data = data[['date', 'open', 'high', 'low',
             'close', 'volume']].sort_values('date')
data.set_index('date', inplace=True)
data.index = pd.DatetimeIndex(data.index, freq='4h')  # Set 4-hour frequency

# Calculate returns
data['open_to_close_return'] = (data['close'] - data['open']) / data['open']

# === AR(4) Model Forecast ===
ar_coefficients = [0.25, 0.25, 0.25, 0.25]
data['forecasted_diff'] = (
    ar_coefficients[0] * data['open_to_close_return'].shift(1) +
    ar_coefficients[1] * data['open_to_close_return'].shift(2) +
    ar_coefficients[2] * data['open_to_close_return'].shift(3) +
    ar_coefficients[3] * data['open_to_close_return'].shift(4)
)
data['arima_forecast'] = data['close'].shift(1) * (1 + data['forecasted_diff'])

# Evaluate AR(4) forecast
data['error'] = np.abs(data['close'] - data['arima_forecast'])
data['cumulative_error'] = data['error'].cumsum()
data['actual_error'] = data['close'] - \
    data['arima_forecast']  # For error forecasting

# Drop NaN values from AR(4) calculations
data = data.dropna()

# Print evaluation metrics
mse = np.mean((data['close'] - data['arima_forecast'])**2)
mape = np.mean(
    np.abs((data['close'] - data['arima_forecast']) / data['close'])) * 100
threshold = 0.05 * data['close'].mean()
avg_error = data['error'].mean()

print(f"Mean Squared Error (MSE): {mse:.2f}")
print(f"Mean Absolute Percentage Error (MAPE): {mape:.2f}%")
print(f"Average error ({avg_error:.2f}) is {'within' if avg_error <= threshold else 'exceeds'} "
      f"the acceptable threshold ({threshold:.2f}).")

# Plot AR(4) forecast and cumulative error
plt.figure(figsize=(12, 8))
plt.subplot(2, 1, 1)
plt.plot(data.index, data['close'], label='BTC Price', color='blue')
plt.plot(data.index, data['arima_forecast'],
         label='AR(4) Forecast', color='orange')
plt.title('AR(4) Forecast vs BTC Price')
plt.xlabel('Date')
plt.ylabel('Price (USD)')
plt.legend()
plt.grid(True)

plt.subplot(2, 1, 2)
plt.plot(data.index, data['cumulative_error'],
         label='Cumulative Error', color='red')
plt.title('Cumulative Error')
plt.xlabel('Date')
plt.ylabel('Cumulative Error (USD)')
plt.legend()
plt.grid(True)

plt.tight_layout()
plt.show()

# === Technical Indicators ===
macd = MACD(data['close'], window_slow=30, window_fast=10, window_sign=5)
data['MACD'] = macd.macd()
data['MACD_S'] = macd.macd_signal()
data['MACD_S_Delta'] = data['MACD_S'].shift(1).diff()
data['MACD_Hist'] = macd.macd_diff()

# Lagged returns and EMAs
data['Lag1'] = data['close'].shift(1).pct_change(1)
data['Lag4'] = data['close'].shift(1).pct_change(4)
data['EMA5'] = data['close'].shift(1).ewm(span=5, adjust=False).mean().diff()
data['EMA10'] = data['close'].shift(1).ewm(span=10, adjust=False).mean().diff()
data['EMA30'] = data['close'].shift(1).ewm(span=30, adjust=False).mean().diff()

# Drop NaN values from indicators
data = data.dropna()

# === Linear Regression for MACD_S ===
id_macd_s = ['EMA5', 'EMA10', 'EMA30']
dv_macd_s = 'MACD_S'
x_macd_s = sm.add_constant(data[id_macd_s])
y_macd_s = data[dv_macd_s]

# Train/test split
train_size = int(0.8 * len(data))
x_macd_s_train, x_macd_s_test = x_macd_s[:train_size], x_macd_s[train_size:]
y_macd_s_train, y_macd_s_test = y_macd_s[:train_size], y_macd_s[train_size:]

# Fit model
model_macd_s = sm.OLS(y_macd_s_train, x_macd_s_train).fit()
y_macd_s_pred = model_macd_s.predict(x_macd_s_test)

# Apply coefficients
data['MACD_S_Forecast'] = (
    model_macd_s.params['const'] +
    model_macd_s.params['EMA5'] * data['EMA5'] +
    model_macd_s.params['EMA10'] * data['EMA10'] +
    model_macd_s.params['EMA30'] * data['EMA30']
)
data['MACD_S_Delta_Forecast'] = data['MACD_S_Forecast'].diff()

# Plot MACD_S forecast
plt.figure(figsize=(12, 6))
plt.plot(y_macd_s_test.index, y_macd_s_test, label='MACD_S', color='blue')
plt.plot(y_macd_s_test.index, y_macd_s_pred,
         label='MACD_S Forecasted', color='orange')
plt.title('MACD_S Forecast vs Actual')
plt.xlabel('Date')
plt.ylabel('MACD_S')
plt.legend()
plt.grid(True)
plt.show()

print("\nStatsmodels Linear Regression Summary for MACD_S:")
print(model_macd_s.summary())

"""
# === Linear Regression for MACD_Hist ===
id_macd_hist = ['EMA5', 'EMA10', 'EMA30']
dv_macd_hist = 'MACD_Hist'
x_macd_hist = sm.add_constant(data[id_macd_hist])
y_macd_hist = data[dv_macd_hist]

# Train/test split
train_size = int(0.8 * len(data))
x_macd_hist_train, x_macd_hist_test = x_macd_hist[:
                                                  train_size], x_macd_hist[train_size:]
y_macd_hist_train, y_macd_hist_test = y_macd_hist[:
                                                  train_size], y_macd_hist[train_size:]

# Fit model
model_macd_hist = sm.OLS(y_macd_hist_train, x_macd_hist_train).fit()
y_macd_hist_pred = model_macd_hist.predict(x_macd_hist_test)

# Apply coefficients
data['MACD_Hist_Forecast'] = (
    model_macd_hist.params['const'] +
    model_macd_hist.params['EMA5'] * data['EMA5'] +
    model_macd_hist.params['EMA10'] * data['EMA10'] +
    model_macd_hist.params['EMA30'] * data['EMA30']
)

# Plot MACD_Hist forecast
plt.figure(figsize=(12, 6))
plt.plot(y_macd_hist_test.index, y_macd_hist_test,
         label='MACD_Hist', color='blue')
plt.plot(y_macd_hist_test.index, y_macd_hist_pred,
         label='MACD_Hist Forecasted', color='orange')
plt.title('MACD_Hist Forecast vs Actual')
plt.xlabel('Date')
plt.ylabel('MACD_Hist')
plt.legend()
plt.grid(True)
plt.show()

print("\nStatsmodels Linear Regression Summary for MACD_Hist:")
print(model_macd_hist.summary())

# === ARIMA for MACD_Hist ===
scaler_y = StandardScaler()
scaler_exog = StandardScaler()

# Scale target and exogenous variables
data['MACD_Hist_Scaled'] = scaler_y.fit_transform(data[['MACD_Hist']])
exog_cols = ['Lag1', 'Lag4', 'MACD_S_Delta']
data[exog_cols] = scaler_exog.fit_transform(data[exog_cols])

# Stationarity test
adf_result = adfuller(data['MACD_Hist_Scaled'])
print("\nADF Test for Stationarity (Scaled MACD_Hist):")
print(f"ADF Statistic: {adf_result[0]:.4f}")
print(f"P-Value: {adf_result[1]:.4f}")
print("Stationary" if adf_result[1] <
      0.05 else "Non-Stationary (consider differencing)")

# Train/test split
series = data['MACD_Hist_Scaled']
exog = data[exog_cols]
train_size = int(0.8 * len(series))
train, test = series[:train_size], series[train_size:]
train_original, test_original = data['MACD_Hist'][:
                                                  train_size], data['MACD_Hist'][train_size:]
train_exog, test_exog = exog[:
                             train_size], exog[train_size:train_size + len(test)]

# Rolling one-step-ahead forecast
forecasts = []
conf_ints = []
test_index = test.index

for i in range(len(test)):
    train_end = train_size + i
    train_data = series[:train_end]
    train_exog_data = exog[:train_end]

    try:
        model = ARIMA(train_data, exog=train_exog_data, order=(2, 0, 1))
        model_fit = model.fit()
        exog_next = exog.iloc[train_end:train_end + 1]
        forecast_obj = model_fit.forecast(steps=1, exog=exog_next)
        forecast_scaled = forecast_obj.iloc[0]
        conf_int_scaled = model_fit.get_forecast(
            steps=1, exog=exog_next).conf_int(alpha=0.05).iloc[0]
        forecasts.append(forecast_scaled)
        conf_ints.append(conf_int_scaled)
    except Exception as e:
        print(f"ARIMA fit failed at step {i}: {e}")
        forecasts.append(np.nan)
        conf_ints.append([np.nan, np.nan])

# Inverse transform forecasts
forecasts = np.array(forecasts)
conf_ints = np.array(conf_ints)
forecast_values = scaler_y.inverse_transform(
    forecasts.reshape(-1, 1)).flatten()
conf_int = scaler_y.inverse_transform(conf_ints)

# Store MACD_Hist_Forecast in DataFrame
data['MACD_Hist_Forecast'] = pd.Series(np.nan, index=data.index)
data.loc[test_index, 'MACD_Hist_Forecast'] = forecast_values

# Create confidence interval DataFrame
conf_int_values = pd.DataFrame({
    'lower_MACD_Hist': conf_int[:, 0],
    'upper_MACD_Hist': conf_int[:, 1]
}, index=test_index)

# Calculate R-squared
r2 = r2_score(test_original, forecast_values)
print(f"\nR-squared for ARIMA MACD_Hist forecast: {r2:.4f}")

# Plot MACD_Hist forecast
plt.figure(figsize=(10, 6))
plt.plot(test_original.index, test_original.values,
         label='Actual MACD_Hist', color='blue', linewidth=2)
plt.plot(test_index, forecast_values,
         label='Forecasted MACD_Hist', color='red', linewidth=2)
plt.fill_between(test_index, conf_int_values['lower_MACD_Hist'],
                 conf_int_values['upper_MACD_Hist'], color='pink', alpha=0.2, label='95% Confidence Interval')
plt.title('ARIMA(2,0,1) Rolling One-Step Forecast vs Actual MACD_Hist')
plt.xlabel('Date')
plt.ylabel('MACD_Hist')
plt.legend()
plt.grid(True)
plt.show()

# Save MACD_Hist forecast results
forecast_df = pd.DataFrame({
    'Date': test_original.index,
    'Actual': test_original.values,
    'Forecast': forecast_values,
    'Lower_CI': conf_int_values['lower_MACD_Hist'],
    'Upper_CI': conf_int_values['upper_MACD_Hist']
})
forecast_df.to_csv('macd_hist_arima_forecast_results.csv', index=False)
"""
data['actual_error_lag1'] = data['actual_error'].shift(1).diff()
data['actual_error_lag2'] = data['actual_error'].shift(2).diff()
data['actual_error_lag3'] = data['actual_error'].shift(3).diff()
data['actual_error_lag4'] = data['actual_error'].shift(4).diff()

# === Error Forecast using MACD_Hist_Forecast ===
# Linear regression to forecast Actual Error
id_error = ['Lag1', 'Lag4',
            'MACD_S_Delta_Forecast', 'MACD_Hist']
dv_error = 'actual_error'
# Drop rows with NaN in predictors or target
data_error = data.dropna(subset=id_error + [dv_error])

x_error = sm.add_constant(data_error[id_error])
y_error = data_error[dv_error]

# Train/test split
train_size_error = int(0.8 * len(data_error))
x_error_train, x_error_test = x_error[:
                                      train_size_error], x_error[train_size_error:]
y_error_train, y_error_test = y_error[:
                                      train_size_error], y_error[train_size_error:]

# Fit model
model_error = sm.OLS(y_error_train, x_error_train).fit()
y_error_pred = model_error.predict(x_error_test)

# Store error forecast in DataFrame
data['error_forecast'] = pd.Series(np.nan, index=data.index)
data.loc[y_error_test.index, 'error_forecast'] = y_error_pred

# Plot error forecast
plt.figure(figsize=(12, 6))
plt.plot(y_error_test.index, y_error_test, label='Actual Error', color='blue')
plt.plot(y_error_test.index, y_error_pred,
         label='Forecasted Error', color='orange')
plt.title('Error Forecast vs Actual')
plt.xlabel('Date')
plt.ylabel('Error (USD)')
plt.legend()
plt.grid(True)
plt.show()

print("\nStatsmodels Linear Regression Summary for Error Forecast:")
print(model_error.summary())

# === Error Forecast Calculation === #
coefficients = model_error.params

# Calculate the Error Forecast
data['Error_Forecast'] = (
    coefficients['const'] +
    coefficients['Lag1'] * data['Lag1'] +
    coefficients['Lag4'] * data['Lag4'] +
    coefficients['MACD_S_Delta_Forecast'] * data['MACD_S_Delta_Forecast'] +
    coefficients['MACD_Hist'] * data['MACD_Hist']
)

data['Error_Forecast'] += data['actual_error'].shift(1)

data = data.dropna()

# === Plot Forecasted Error vs Actual Error === #
plt.figure(figsize=(12, 6))
plt.plot(data.index, data['actual_error'], label='Error', color='blue')
plt.plot(data.index, data['Error_Forecast'],
         label='Forecasted Error', color='orange')
plt.title('Forecasted Error vs Error')
plt.xlabel('Date')
plt.ylabel('Error (USD)')
plt.legend()
plt.tight_layout()
plt.show()

# === ARIMA Error Corrected Forecast === #
data['ARIMA Error Corrected Forecast'] = data['arima_forecast'] + \
    data['Error_Forecast']

data['cumulative_error_corrected'] = np.abs(
    data['close'] - data['ARIMA Error Corrected Forecast']).cumsum()

# === Plot ARIMA Error Corrected Forecast vs Actual Price === #
plt.figure(figsize=(12, 6))
plt.plot(data.index, data['close'], label='BTC Price', color='blue')
plt.plot(data.index, data['arima_forecast'],
         label='ARIMA Forecast', color='green')
plt.plot(data.index, data['ARIMA Error Corrected Forecast'],
         label='Error Corrected Forecast', color='orange')
plt.title('Error Corrected Forecast vs BTC Price')
plt.xlabel('Date')
plt.ylabel('Price (USD)')
plt.legend()
plt.tight_layout()
plt.show()

# === Plot Cumulative Error Comparison === #
plt.figure(figsize=(12, 6))
plt.plot(data.index, data['cumulative_error'],
         label='Cumulative Error (Initial Forecast)', color='blue')
plt.plot(data.index, data['cumulative_error_corrected'],
         label='Cumulative Error (Error Corrected Forecast)', color='orange')
plt.title('Cumulative Error Comparison: Initial vs Error Corrected Forecast')
plt.xlabel('Date')
plt.ylabel('Cumulative Error (USD)')
plt.legend()
plt.tight_layout()
plt.show()

# Print cumulative error comparison
print("\nCumulative Error Comparison:")
print(
    f"Final Cumulative Error (Initial Forecast): {data['cumulative_error'].iloc[-1]:.2f}")
print(
    f"Final Cumulative Error (Error Corrected Forecast): {data['cumulative_error_corrected'].iloc[-1]:.2f}")
```
