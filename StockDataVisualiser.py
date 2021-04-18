from datetime import date, timedelta  # this is for manpulating dates
import PyDSWS
import matplotlib.pyplot as plt  # this is for plotting graphs
import matplotlib.lines as mlines #for creating our own legend
import numpy as np  # this is a useful numerical package
import pandas as pd  # this makes it easy to handle data
import statsmodels.api as sm  # this is for regression
import talib  # this is a package that can perform technical analysis for us
from pandas.plotting import \
    register_matplotlib_converters  # registering matplotlib converters
from pytrends.request import \
    TrendReq  # this is a package to get google trends data
        
register_matplotlib_converters() # registering matplotlib converters


#the objective of this is to get stock data to enable us to produce the statistics that we want

#first of all we need to get some input from the user as to what stocks they want to see
def get_ticker():
    
    #general overview to the user of what this script will do
    print('This script will take some user input and display various statistics and graphs')
    

    ticker = str(input('\nPlease enter a stock ticker:\n'))
    #start_date = str(input('\nPlease enter a start date (e.g. 2005-01-01):\n'))

    return ticker

#the second part of this script will be getting the stock data and calculating the statistics we need
############################################

def get_stock_information(ticker):
    #we need to find a data service that we can use that will allow us to take stock data
    #we will use Alpha Vantagev- we have made an account and our API key and data is below - lol, now using Datastream

    #login to datastream using our credentials

    login_info = pd.read_csv('login.csv')
    username = login_info['info'][0]
    password = login_info['info'][1]

    ds = PyDSWS.Datastream(username=username, password=password)
    raw_prices_daily = ds.get_data(tickers='MSACWF$(NR)', start='2020-01-01', end='-0D', freq='D')

    #now we can use this query to input what we are testing against the model
    raw_prices_daily['StockTicker'] = ds.get_data(tickers=ticker, start='2020-01-01', end='-0D', freq='D')
    raw_prices_daily['StockName'] = ds.get_data(tickers=ticker, fields='NAME', date='2020-01-01')

    stock_name = raw_prices_daily['StockName'].iloc[0]

    #make the index a datetime index, so that we have more freedom when working with matplotlib
    raw_prices_daily = raw_prices_daily.reset_index()
    raw_prices_daily['Date'] = pd.to_datetime(raw_prices_daily['Date']) 
    raw_prices_daily.set_index('Date', inplace=True)

    stock_data = raw_prices_daily

    return stock_data, stock_name


def get_google_trends_info(stock_name):
    #here we will query google to get some google trends data

    #Import - tz is timezone
    pytrends = TrendReq(hl='en-US', tz=0)

    ### import it into the query - for dates use yyy-mm-dd 
    kw_list = [str(stock_name)]
    pytrends.build_payload(kw_list, cat=0, timeframe='today 12-m', geo='',gprop='')
    google_trends = pytrends.interest_over_time()


    return google_trends


def tech_indicator_calc(stock_data):
    #the first thing we will work out with our stock data is MACD
    #the formula we will use to calculate the moving average convergence divergence (macd) is as follows
    #(12 Day Exponential Moving Average (EMA) - 26 Day EMA) 
    #instead of having to code the whole thing, we can use the talib module and input the below

    macd_12, macd_26, macdhist = talib.MACD(stock_data['StockTicker'], fastperiod=12, slowperiod=26, signalperiod=9)

    #we will also calculate the Relative Strength Index (RSI)
    rsi = talib.RSI(stock_data['StockTicker'], timeperiod=14)

    macd_diffs = macd_26 - macd_12

    tech_df = pd.concat([macd_12, macd_26, macdhist, rsi, macd_diffs], axis=1)
    tech_df.columns = ['macd_12', 'macd_26', 'macdhist', 'rsi', 'macd_diffs']

    tech_df['macd_diffs_shift'] = tech_df['macd_diffs'].shift(-1)
    tech_df.drop(tech_df.tail(1).index,inplace=True)

    tech_df.loc[(tech_df['macd_diffs_shift'] < 0) & (tech_df['macd_diffs'] > 0), 'macd_shift_up'] = tech_df['macd_12']
    tech_df.loc[(tech_df['macd_diffs_shift'] > 0) & (tech_df['macd_diffs'] < 0), 'macd_shift_down'] = tech_df['macd_12']



    tech_df['rsi_shift'] = tech_df['rsi'].shift(-1)
    tech_df.drop(tech_df.tail(1).index,inplace=True)

    tech_df.loc[(tech_df['rsi_shift'] > 30) & (tech_df['rsi'] < 30), 'rsi_up'] = tech_df['rsi']
    tech_df.loc[(tech_df['rsi_shift'] < 70) & (tech_df['rsi'] > 70), 'rsi_down'] = tech_df['rsi']

    print(tech_df)
    #return macd, macdsignal, macdhist, macd_diff, rsi
    return tech_df


def stock_regression(stock_data):

    #here we are simply creating some moving averages, for both 12 and 26 length periods
    stock_data['ema12'] = stock_data['StockTicker'].ewm(com=12).mean()
    stock_data['ema26'] = stock_data['StockTicker'].ewm(com=26).mean()

    #signals[['ema12', 'ema26']]
    
    #here we are looking at adding in points to show when the moverage average crosses
    #the first line will get the difference, and the first will shift it up
    #stock_data['ema_diff'] = stock_data['ema26'] - stock_data['ema12']
    #stock_data['ema_diff_shift'] = stock_data['ema_diff'].shift(-1)
    #stock_data.drop(stock_data.tail(1).index,inplace=True)
    
    """
    stock_data['ema_diff_up'] = np.where(stock_data['ema_diff'].between(0.1, -0.1) & (stock_data['ema_diff_shift'] > 0, 1, 0))
    stock_data['ema_diff_down'] = np.where(stock_data['ema_diff'].between(0.1, -0.1) & (stock_data['ema_diff_shift'] < 0, 1, 0)) 
    """

    print(stock_data.head())
    print(stock_data.tail())
    print(stock_data.shape)

    #this will create some regression data so that we can plot it
    #at the moment this is just simple linear regression
    stock_data['regression'] = sm.OLS(stock_data['StockTicker'], sm.add_constant(range(len(stock_data.index)),
                                prepend=True)).fit().fittedvalues


    return stock_data


#the third part of this script will be plotting the data
###########################################

def plot_graphs(stock_data, google_trends, tech_df, ticker, stock_name):
    #we can plot some of the data we have made earlier, price and some macd data


    stock_updown = stock_data[['StockTicker']]
    stock_updown = stock_updown.join(tech_df)
    stock_updown.rename(columns={stock_updown.columns[0]: 'StockTicker'}, inplace=True)
    col_list = ['StockTicker','macd_shift_up', 'macd_shift_down', 'rsi_up',  'rsi_down']
    stock_updown = stock_updown[col_list]

    stock_updown['macd_shift_up_d'] = stock_updown['macd_shift_up'].shift(-1)
    stock_updown['macd_shift_up_u'] = stock_updown['macd_shift_up'].shift(1)
    stock_updown['macd_shift_up_uu'] = stock_updown['macd_shift_up'].shift(-2)

    stock_updown['macd_shift_down_d'] = stock_updown['macd_shift_down'].shift(-1)
    stock_updown['macd_shift_down_u'] = stock_updown['macd_shift_down'].shift(1)
    stock_updown['macd_shift_down_uu'] = stock_updown['macd_shift_down'].shift(-2)

    stock_updown['rsi_up_d'] = stock_updown['rsi_up'].shift(-1)
    stock_updown['rsi_up_u'] = stock_updown['rsi_up'].shift(1)
    stock_updown['rsi_up_uu'] = stock_updown['rsi_up'].shift(-2)

    stock_updown['rsi_down_d'] = stock_updown['rsi_down'].shift(-1)
    stock_updown['rsi_down_u'] = stock_updown['rsi_down'].shift(1)
    stock_updown['rsi_down_uu'] = stock_updown['rsi_down'].shift(-2)

    stock_updown.drop(stock_updown.tail(2).index,inplace=True)
    stock_updown.drop(stock_updown.head(1).index,inplace=True)

    stock_updown['macd_shift_up'] = pd.concat([stock_updown['macd_shift_up'].combine_first(stock_updown['macd_shift_up_d']).combine_first(stock_updown['macd_shift_up_u']).combine_first(stock_updown['macd_shift_up_uu'])], axis=1)
    stock_updown['macd_shift_down'] = pd.concat([stock_updown['macd_shift_down'].combine_first(stock_updown['macd_shift_down_d']).combine_first(stock_updown['macd_shift_down_u']).combine_first(stock_updown['macd_shift_down_uu'])], axis=1)
    stock_updown['rsi_up'] = pd.concat([stock_updown['rsi_up'].combine_first(stock_updown['rsi_up_d']).combine_first(stock_updown['rsi_up_u']).combine_first(stock_updown['rsi_up_uu'])], axis=1)
    stock_updown['rsi_down'] = pd.concat([stock_updown['rsi_down'].combine_first(stock_updown['rsi_down_d']).combine_first(stock_updown['rsi_down_u']).combine_first(stock_updown['rsi_down_uu'])], axis=1)

    stock_updown.loc[(stock_updown['rsi_up'] > -9999) & (stock_updown['macd_shift_up'] > -9999), 'stock_up'] = stock_updown['StockTicker']
    stock_updown.loc[(stock_updown['rsi_down'] > -9999) & (stock_updown['macd_shift_down'] > -9999), 'stock_down'] = stock_updown['StockTicker']

    print(stock_updown.tail(100))

    #this will set up the subplot and give it a title
    f, axarr = plt.subplots(nrows=4, ncols=1, sharex=True, gridspec_kw={'height_ratios':[4,1,1,1]})

    f.suptitle('Stock Price and Technical Indicators: ' + stock_name)

    #this will configure the first graph - the stock price
    axarr[0].plot(stock_data[['StockTicker', 'ema12', 'ema26']])
    axarr[0].plot(stock_data['regression'], 'r--', linewidth=2, markersize=1)
    axarr[0].plot(stock_updown['stock_up'], 'g^')
    axarr[0].plot(stock_updown['stock_down'], 'rv')
    axarr[0].legend([stock_name, 'ema12', 'ema26', 'regression'])
    axarr[0].set_title('Stock Price')
    #axarr[0].plot(signals.loc[signals.positions == 1.0].index, 
    #     signals.short_mavg[signals.positions == 1.0],
    #     '^', markersize=10, color='m')


    #this will plot the MACD, the line is on 0 to reflect convergence/divergence
    axarr[1].plot(tech_df[['macd_12', 'macd_26']])
    axarr[1].plot(tech_df['macd_shift_up'], 'g^')
    axarr[1].plot(tech_df['macd_shift_down'], 'rv')
    #axarr[1].plot(macdhist) - we may add this back in, but for the time being lets not
    #macd_legend = mlines.Line2D([], [], color='C0', label='macd-12') #have to create a custom legend here
    #macdsignal_legend = mlines.Line2D([], [], color='C1', label='macd-26') #have to create a custom legend here
    #axarr[1].legend(handles=[macd_legend, macdsignal_legend])
    axarr[1].legend(['macd', 'macd_26'])
    axarr[1].set_title('MACD')
    axarr[1].axhline(0,color='black',ls='--')

    #this plots RSI, the line on 30 reflects oversold and 70 reflects overbought
    axarr[2].plot(tech_df['rsi'])
    axarr[2].set_title('RSI')
    axarr[2].plot(tech_df['rsi_up'], 'g^')
    axarr[2].plot(tech_df['rsi_down'], 'rv')
    axarr[2].axhline(30,color='green',ls='--')
    axarr[2].axhline(70,color='red',ls='--')

    #this plots google trends data
    try:
        axarr[3].plot(google_trends[[str(stock_name)]])
        axarr[3].set_title('Google Trends')
    except Exception:
        pass

    plt.show()


def main():
    #this is the main variable where we will run all of the about functions

    ticker = get_ticker()
    stock_data, stock_name = get_stock_information(ticker)
    google_trends = get_google_trends_info(stock_name)
    #macd, macdsignal, macdhist, macd_diff, rsi = tech_indicator_calc(stock_data)
    tech_df= tech_indicator_calc(stock_data)
    stock_data = stock_regression(stock_data)
    plot_graphs(stock_data, google_trends, tech_df, ticker, stock_name)


if __name__ == "__main__":
    main()



#TODO 
#improve regression
#add some fundemental indicators?
#replace datetime.date with new
#pytrends - testing diff functionality
#app
#points that register macd movement - spit out to csv to look
#https://www.datacamp.com/community/tutorials/finance-python-trading#tradingstrategy